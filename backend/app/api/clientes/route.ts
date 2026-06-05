import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Cliente, ClienteInput } from '@/types';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const etapa = searchParams.get('etapa');
        const origen = searchParams.get('origen');
        const busqueda = searchParams.get('q');
        const hotLeads = searchParams.get('hot') === 'true';
        const asesorId = searchParams.get('asesorId');   // filtro "mis clientes"
        const page = parseInt(searchParams.get('page') ?? '1');
        const pageSize = parseInt(searchParams.get('pageSize') ?? '20');
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabaseAdmin
            .from('clientes')
            .select('*', { count: 'exact' })
            .order('ultima_actividad', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (etapa) query = query.eq('etapa', etapa);
        if (origen) query = query.eq('origen', origen);
        if (asesorId) query = query.eq('asesor_id', asesorId);   // cada asesor ve solo sus leads

        if (hotLeads) query = query.gte('puntuacion_lead', 70);

        if (busqueda) {
            query = query.or(`nombre.ilike.%${busqueda}%,telefono.ilike.%${busqueda}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: { clientes: data ?? [], total: count ?? 0 },
        } as ApiResponse<{ clientes: Cliente[]; total: number }>);
    } catch (error) {
        console.error('[GET /api/clientes]', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener clientes' } as ApiResponse,
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: ClienteInput = await request.json();


        if (!body.nombre?.trim()) {
            return NextResponse.json(
                { success: false, error: 'El nombre es requerido' } as ApiResponse,
                { status: 400 }
            );
        }

        const telefonoLimpio = body.telefono?.replace(/\D/g, '');
        if (!telefonoLimpio || telefonoLimpio.length !== 9) {
            return NextResponse.json(
                { success: false, error: 'Teléfono inválido (debe tener 9 dígitos)' } as ApiResponse,
                { status: 400 }
            );
        }

        const { data: existente } = await supabaseAdmin
            .from('clientes')
            .select('id, nombre, telefono, etapa')
            .eq('telefono', telefonoLimpio)
            .maybeSingle();

        if (existente) {

            await supabaseAdmin
                .from('clientes')
                .update({ ultima_actividad: new Date().toISOString() })
                .eq('id', existente.id);

            return NextResponse.json({
                success: true,
                data: existente,
                message: 'Cliente ya registrado — se actualizó su actividad',
                duplicate: true,
            } as ApiResponse & { duplicate: boolean });
        }

        const { data: nuevo, error } = await supabaseAdmin
            .from('clientes')
            .insert({
                nombre: body.nombre.trim(),
                telefono: telefonoLimpio,
                email: body.email ?? null,
                origen: body.origen ?? 'web',
                etapa: 'nuevo',
                ultima_actividad: new Date().toISOString(),
                preferencias_extra: body.propiedad_interes
                    ? { propiedad_interes: body.propiedad_interes }
                    : null,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(
            {
                success: true,
                data: nuevo,
                message: 'Cliente registrado exitosamente',
                duplicate: false,
            } as ApiResponse & { duplicate: boolean },
            { status: 201 }
        );
    } catch (error) {
        console.error('[POST /api/clientes]', error);
        return NextResponse.json(
            { success: false, error: 'Error al registrar cliente' } as ApiResponse,
            { status: 500 }
        );
    }
}