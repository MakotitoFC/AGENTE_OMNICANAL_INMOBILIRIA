import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Cliente } from '@/types';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
    try {
        const clienteId = parseInt(params.id);

        const [clienteRes, seguimientosRes, mensajesRes] = await Promise.all([
            supabaseAdmin
                .from('clientes')
                .select('*')
                .eq('id', clienteId)
                .single(),

            supabaseAdmin
                .from('seguimientos')
                .select('*')
                .eq('cliente_id', clienteId)
                .order('created_at', { ascending: false }),

            supabaseAdmin
                .from('chat_mensajes')
                .select('*')
                .eq('cliente_id', clienteId)
                .order('fecha_creacion', { ascending: false })
                .limit(20),
        ]);

        if (clienteRes.error || !clienteRes.data) {
            return NextResponse.json(
                { success: false, error: 'Cliente no encontrado' } as ApiResponse,
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                cliente: clienteRes.data,
                seguimientos: seguimientosRes.data ?? [],
                mensajes: mensajesRes.data ?? [],
            },
        } as ApiResponse);
    } catch (error) {
        console.error('[GET /api/clientes/[id]]', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener cliente' } as ApiResponse,
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const clienteId = parseInt(params.id);
        const body = await request.json();

        if (body.nota_asesor) {
            const { error: seguimientoError } = await supabaseAdmin
                .from('seguimientos')
                .insert({
                    cliente_id: clienteId,
                    tipo: 'nota',
                    programado_para: new Date().toISOString(),
                    ejecutado_en: new Date().toISOString(),
                    estado: 'realizado',
                    notas: body.nota_asesor,
                });

            if (seguimientoError) throw seguimientoError;

            delete body.nota_asesor;
        }

        const camposActualizar: Partial<Cliente> = {
            ...body,
            updated_at: new Date().toISOString(),
            ultima_actividad: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
            .from('clientes')
            .update(camposActualizar)
            .eq('id', clienteId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data,
            message: 'Cliente actualizado',
        } as ApiResponse<Cliente>);
    } catch (error) {
        console.error('[PATCH /api/clientes/[id]]', error);
        return NextResponse.json(
            { success: false, error: 'Error al actualizar cliente' } as ApiResponse,
            { status: 500 }
        );
    }
}