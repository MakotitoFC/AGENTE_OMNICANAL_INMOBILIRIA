import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') ?? '1');
        const pageSize = parseInt(searchParams.get('pageSize') ?? '20');
        const offset = (page - 1) * pageSize;
        const estado = searchParams.get('estado');

        let query = supabaseAdmin
            .from('ventas')
            .select(`
                *,
                cliente:clientes(id, nombre, telefono, etapa),
                propiedad:propiedades(id, direccion, distrito, tipo, area_m2),
                asesor:profiles(id, nombre, role)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (estado) query = query.eq('estado', estado);

        const { data, error, count } = await query;
        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: { ventas: data ?? [], total: count ?? 0 },
        } as ApiResponse);
    } catch (error) {
        console.error('[GET /api/ventas]', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener ventas' } as ApiResponse,
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            propiedad_id,
            cliente_id,
            asesor_id,
            precio_original,
            descuento_aplicado = 0,
            tipo_pago,
            num_cuotas = 0,
            notas,
            fecha_venta,
        } = body;

        if (!propiedad_id || !cliente_id || !precio_original || !tipo_pago) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos requeridos: propiedad_id, cliente_id, precio_original, tipo_pago' } as ApiResponse,
                { status: 400 }
            );
        }

        const precio_final = Number(precio_original) - (Number(precio_original) * Number(descuento_aplicado) / 100);

        const { data, error } = await supabaseAdmin
            .from('ventas')
            .insert({
                propiedad_id,
                cliente_id: Number(cliente_id),
                asesor_id: asesor_id ?? null,
                fecha_venta: fecha_venta ?? new Date().toISOString().split('T')[0],
                precio_original: Number(precio_original),
                descuento_aplicado: Number(descuento_aplicado),
                precio_final,
                tipo_pago,
                num_cuotas: Number(num_cuotas),
                estado: 'activo',
                notas: notas ?? null,
            })
            .select()
            .single();

        if (error) throw error;

        await Promise.all([
            supabaseAdmin
                .from('propiedades')
                .update({ estado: 'vendido', activo: false })
                .eq('id', propiedad_id),
            supabaseAdmin
                .from('clientes')
                .update({ etapa: 'cierre', ultima_actividad: new Date().toISOString() })
                .eq('id', Number(cliente_id)),
        ]);

        return NextResponse.json(
            { success: true, data, message: 'Venta registrada exitosamente' } as ApiResponse,
            { status: 201 }
        );
    } catch (error) {
        console.error('[POST /api/ventas]', error);
        return NextResponse.json(
            { success: false, error: 'Error al registrar la venta' } as ApiResponse,
            { status: 500 }
        );
    }
}
