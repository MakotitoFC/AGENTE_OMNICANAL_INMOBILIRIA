import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ─── ÁREA 2: Calificación de Leads ────────────────────────────────────────────
// Clasifica prospectos por probabilidad de cierre usando el modelo ML entrenado
// (GradientBoosting). Enfoque único: scoring. Sin agente, sin LLM.
const ML_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

// Días desde la última actividad
function diasInactivo(ua: string | null): number {
  if (!ua) return 999;
  return Math.floor((Date.now() - new Date(ua).getTime()) / 86_400_000);
}

interface PrefExtra {
  problema_legal?: boolean; problema_precio?: boolean;
  problema_accesibilidad?: boolean; solo_explorando?: boolean;
}

// Trae todos los clientes (paginado). Filtra por asesor si se indica.
async function fetchClientes(asesorId?: string | null): Promise<Record<string, unknown>[]> {
  const PAGE = 1000; let desde = 0;
  const acc: Record<string, unknown>[] = [];
  for (;;) {
    let q = supabaseAdmin.from('clientes').select('*').neq('etapa', 'perdido');
    if (asesorId) q = q.eq('asesor_id', asesorId);
    const { data, error } = await q.range(desde, desde + PAGE - 1);
    if (error) throw error;
    const lote = data ?? [];
    acc.push(...lote);
    if (lote.length < PAGE) break;
    desde += PAGE;
  }
  return acc;
}

// Clasificación por probabilidad → intención de compra
function clasificar(prob: number): 'caliente' | 'tibio' | 'frio' {
  if (prob >= 0.50) return 'caliente';
  if (prob >= 0.25) return 'tibio';
  return 'frio';
}

// Factores que explican el score (transparencia del modelo)
function factores(c: Record<string, unknown>, segs: number): string[] {
  const f: string[] = [];
  const etapa = c.etapa as string;
  if (['negociacion', 'cierre'].includes(etapa)) f.push('Etapa avanzada del funnel');
  if (c.presupuesto_min || c.presupuesto_max)    f.push('Presupuesto definido');
  if (c.tipo_preferido)                          f.push('Sabe qué tipo busca');
  if (segs >= 2)                                 f.push(`${segs} seguimientos`);
  const dias = diasInactivo(c.ultima_actividad as string | null);
  if (dias <= 7)                                 f.push('Actividad reciente');
  else if (dias > 30)                            f.push('Inactivo hace tiempo');
  if ((c.puntuacion_lead as number) >= 70)       f.push('Score IA alto');
  return f;
}

export async function GET(request: NextRequest) {
  try {
    const asesorId = request.nextUrl.searchParams.get('asesorId');

    // 1. Datos del CRM
    const [clientes, seguimientos] = await Promise.all([
      fetchClientes(asesorId),
      supabaseAdmin.from('seguimientos').select('cliente_id').range(0, 9999),
    ]);
    const segCount: Record<number, number> = {};
    (seguimientos.data ?? []).forEach((s: { cliente_id: number }) => {
      segCount[s.cliente_id] = (segCount[s.cliente_id] ?? 0) + 1;
    });

    // 2. Construir features crudas para el modelo
    const leadsML = clientes.map(c => {
      const pref = (c.preferencias_extra ?? {}) as PrefExtra;
      return {
        id: c.id,
        etapa: (c.etapa as string) ?? 'contactado',
        origen: (c.origen as string) ?? 'web',
        tiene_presupuesto: (c.presupuesto_min || c.presupuesto_max) ? 1 : 0,
        precio_match: 0,
        tiene_tipo_preferido: c.tipo_preferido ? 1 : 0,
        tiene_distrito: (c.distritos_preferidos && (c.distritos_preferidos as string[]).length) ? 1 : 0,
        dias_inactivo: diasInactivo(c.ultima_actividad as string | null),
        num_seguimientos: segCount[c.id as number] ?? 0,
        puntuacion_lead: Number(c.puntuacion_lead ?? 0),
        problema_legal: pref.problema_legal ? 1 : 0,
        problema_precio: pref.problema_precio ? 1 : 0,
        problema_accesibilidad: pref.problema_accesibilidad ? 1 : 0,
        solo_explorando: pref.solo_explorando ? 1 : 0,
      };
    });

    // 3. Pedir scoring al modelo ML
    let scores: Record<number, number> = {};
    let mlDisponible = true;
    try {
      const resp = await fetch(`${ML_URL}/predecir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsML }),
        signal: AbortSignal.timeout(30000),
      });
      const json = await resp.json();
      (json.ranking ?? []).forEach((r: { id: number; probabilidad: number }) => {
        scores[r.id] = r.probabilidad;
      });
    } catch {
      mlDisponible = false;
    }

    // 4. Combinar + clasificar
    const calificados = clientes.map(c => {
      const prob = scores[c.id as number] ?? 0;
      const segs = segCount[c.id as number] ?? 0;
      return {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        etapa: c.etapa,
        origen: c.origen,
        presupuesto_max: c.presupuesto_max,
        tipo_preferido: c.tipo_preferido,
        distritos_preferidos: c.distritos_preferidos,
        num_seguimientos: segs,
        dias_inactivo: diasInactivo(c.ultima_actividad as string | null),
        probabilidad: prob,
        probabilidad_pct: Math.round(prob * 100),
        clasificacion: clasificar(prob),
        factores: factores(c, segs),
      };
    }).sort((a, b) => b.probabilidad - a.probabilidad);

    const resumen = {
      total: calificados.length,
      caliente: calificados.filter(c => c.clasificacion === 'caliente').length,
      tibio:    calificados.filter(c => c.clasificacion === 'tibio').length,
      frio:     calificados.filter(c => c.clasificacion === 'frio').length,
    };

    return NextResponse.json({
      success: true,
      data: { calificados, resumen, ml_disponible: mlDisponible },
    });
  } catch (err) {
    console.error('[GET /api/calificacion-leads]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
