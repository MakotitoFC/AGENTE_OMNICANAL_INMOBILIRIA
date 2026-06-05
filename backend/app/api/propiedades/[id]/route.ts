import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Propiedad } from '@/types';

type Params = { params: { id: string } };


export async function GET(_req: NextRequest, { params }: Params) {
    try {
        const { data, error } = await supabase
            .from('propiedades')
            .select('*')
            .eq('id', params.id)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { success: false, error: 'Propiedad no encontrada' } as ApiResponse,
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data } as ApiResponse<Propiedad>);
    } catch (error) {
        console.error('[GET /api/propiedades/[id]]', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener propiedad' } as ApiResponse,
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const body = await request.json();

        const { data, error } = await supabaseAdmin
            .from('propiedades')
            .update({ ...body })
            .eq('id', params.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(
            { success: true, data, message: 'Propiedad actualizada' } as ApiResponse,
        );
    } catch (error) {
        console.error('[PUT /api/propiedades/[id]]', error);
        return NextResponse.json(
            { success: false, error: 'Error al actualizar propiedad' } as ApiResponse,
            { status: 500 }
        );
    }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    try {
        const { error } = await supabaseAdmin
            .from('propiedades')
            .update({ activo: false })
            .eq('id', params.id);

        if (error) throw error;

        return NextResponse.json(
            { success: true, message: 'Propiedad desactivada del portal' } as ApiResponse,
        );
    } catch (error) {
        console.error('[DELETE /api/propiedades/[id]]', error);
        return NextResponse.json(
            { success: false, error: 'Error al eliminar propiedad' } as ApiResponse,
            { status: 500 }
        );
    }
}