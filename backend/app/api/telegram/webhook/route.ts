import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types';


interface TelegramWebhookPayload {
    telegram_chat_id: string;
    nombre?: string;
    telefono?: string;
    mensaje?: string;
    accion: 'nuevo_lead' | 'actualizar_lead' | 'mensaje_recibido';
    datos_extraidos?: {
        presupuesto_min?: number;
        presupuesto_max?: number;
        tipo_preferido?: string[];
        distritos_preferidos?: string[];
        puntuacion_lead?: number;
        resumen_ia?: string;
    };
}

export async function POST(request: NextRequest) {
    try {

        const authHeader = request.headers.get('x-webhook-secret');
        if (authHeader !== process.env.WEBHOOK_SECRET) {
            return NextResponse.json(
                { success: false, error: 'No autorizado' } as ApiResponse,
                { status: 401 }
            );
        }

        const payload: TelegramWebhookPayload = await request.json();
        const { telegram_chat_id, accion } = payload;

        if (!telegram_chat_id) {
            return NextResponse.json(
                { success: false, error: 'telegram_chat_id requerido' } as ApiResponse,
                { status: 400 }
            );
        }

        switch (accion) {
            case 'nuevo_lead': {

                const { data: existente } = await supabaseAdmin
                    .from('clientes')
                    .select('id')
                    .eq('telegram_chat_id', telegram_chat_id)
                    .maybeSingle();

                if (existente) {
                    await supabaseAdmin
                        .from('clientes')
                        .update({ ultima_actividad: new Date().toISOString() })
                        .eq('id', existente.id);

                    return NextResponse.json({
                        success: true,
                        message: 'Lead ya existe, actividad actualizada',
                        cliente_id: existente.id,
                    });
                }

                const { data: nuevo, error } = await supabaseAdmin
                    .from('clientes')
                    .insert({
                        telegram_chat_id,
                        nombre: payload.nombre ?? 'Usuario Telegram',
                        telefono: payload.telefono ?? null,
                        origen: 'telegram',
                        etapa: 'nuevo',
                        ultima_actividad: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: 'Lead de Telegram creado',
                    cliente_id: nuevo.id,
                });
            }

            case 'actualizar_lead': {

                const { data: cliente } = await supabaseAdmin
                    .from('clientes')
                    .select('id')
                    .eq('telegram_chat_id', telegram_chat_id)
                    .maybeSingle();

                if (!cliente) {
                    return NextResponse.json(
                        { success: false, error: 'Cliente no encontrado' } as ApiResponse,
                        { status: 404 }
                    );
                }

                const { datos_extraidos } = payload;

                await supabaseAdmin
                    .from('clientes')
                    .update({
                        presupuesto_min: datos_extraidos?.presupuesto_min,
                        presupuesto_max: datos_extraidos?.presupuesto_max,
                        tipo_preferido: datos_extraidos?.tipo_preferido,
                        distritos_preferidos: datos_extraidos?.distritos_preferidos,
                        puntuacion_lead: datos_extraidos?.puntuacion_lead,
                        ultima_actividad: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', cliente.id);

                if (datos_extraidos?.resumen_ia) {
                    await supabaseAdmin.from('seguimientos').insert({
                        cliente_id: cliente.id,
                        tipo: 'telegram',
                        programado_para: new Date().toISOString(),
                        ejecutado_en: new Date().toISOString(),
                        estado: 'realizado',
                        notas: `[IA Telegram] ${datos_extraidos.resumen_ia}`,
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Lead actualizado con datos de IA',
                    cliente_id: cliente.id,
                });
            }

            case 'mensaje_recibido': {

                const { data: cliente } = await supabaseAdmin
                    .from('clientes')
                    .select('id')
                    .eq('telegram_chat_id', telegram_chat_id)
                    .maybeSingle();

                if (!cliente || !payload.mensaje) {
                    return NextResponse.json({ success: true, message: 'Sin acción' });
                }

                await supabaseAdmin.from('chat_mensajes').insert({
                    cliente_id: cliente.id,
                    direccion: 'entrante',
                    contenido: payload.mensaje,
                    tipo_contenido: 'texto',
                    metadata: { fuente: 'telegram' },
                });

                return NextResponse.json({ success: true, message: 'Mensaje guardado' });
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'Acción no reconocida' } as ApiResponse,
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('[POST /api/telegram/webhook]', error);
        return NextResponse.json(
            { success: false, error: 'Error interno del webhook' } as ApiResponse,
            { status: 500 }
        );
    }
}