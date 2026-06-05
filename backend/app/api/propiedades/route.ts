import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Propiedad, PropiedadInput } from '@/types';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const distrito = searchParams.get('distrito');
        const tipo = searchParams.get('tipo');
        const estado = searchParams.get('estado') ?? 'disponible';
        const soloActivas = searchParams.get('todas') !== 'true';
        const page = parseInt(searchParams.get('page') ?? '1');
        const pageSize = parseInt(searchParams.get('pageSize') ?? '12');
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('propiedades')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (soloActivas) query = query.eq('activo', true);
        if (estado && soloActivas) query = query.eq('estado', estado);
        if (distrito) query = query.eq('distrito', distrito);
        if (tipo) query = query.eq('tipo', tipo);

        const { data, error, count } = await query;

        if (error) throw error;

        const response: ApiResponse<{ propiedades: Propiedad[]; total: number }> = {
            success: true,
            data: {
                propiedades: data ?? [],
                total: count ?? 0,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('[GET /api/propiedades]', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener propiedades' } as ApiResponse,
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: PropiedadInput = await request.json();

        if (!body.direccion) {
            return NextResponse.json(
                { success: false, error: 'La dirección es requerida' } as ApiResponse,
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('propiedades')
            .insert({
                ...body,
                activo: body.activo ?? true,
                moneda: body.moneda ?? 'PEN',
                estado: body.estado ?? 'disponible',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(
            { success: true, data, message: 'Propiedad creada exitosamente' } as ApiResponse,
            { status: 201 }
        );
    } catch (error) {
        console.error('[POST /api/propiedades]', error);
        return NextResponse.json(
            { success: false, error: 'Error al crear propiedad' } as ApiResponse,
            { status: 500 }
        );
    }
}