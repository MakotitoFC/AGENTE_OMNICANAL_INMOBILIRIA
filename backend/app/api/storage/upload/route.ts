import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types';

// POST /api/storage/upload
// Sube imágenes al bucket 'propiedades' de Supabase Storage
// Recibe FormData con campo 'file' y opcional 'propiedadId'
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const propiedadId = formData.get('propiedadId') as string | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No se recibió ningún archivo' } as ApiResponse,
                { status: 400 }
            );
        }

        // Validar tipo de archivo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!tiposPermitidos.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Solo se permiten imágenes (JPG, PNG, WEBP)' } as ApiResponse,
                { status: 400 }
            );
        }

        // Validar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, error: 'El archivo no puede superar los 5MB' } as ApiResponse,
                { status: 400 }
            );
        }

        // Generar nombre único
        const ext = file.name.split('.').pop();
        const folder = propiedadId ?? 'general';
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabaseAdmin.storage
            .from('propiedades-fotos')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: urlData } = supabaseAdmin.storage
            .from('propiedades-fotos')
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            data: { url: urlData.publicUrl, path: fileName },
            message: 'Imagen subida exitosamente',
        } as ApiResponse);
    } catch (error) {
        console.error('[POST /api/storage/upload]', error);
        return NextResponse.json(
            { success: false, error: 'Error al subir imagen' } as ApiResponse,
            { status: 500 }
        );
    }
}