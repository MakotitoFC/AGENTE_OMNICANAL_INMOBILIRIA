import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ─── Helper: traer todas las filas superando el límite de 1000 ────────────────
async function fetchAll(
  tabla: string,
  select: string,
  filtro?: (q: ReturnType<ReturnType<typeof supabaseAdmin.from>['select']>) => unknown
): Promise<Record<string, unknown>[]> {
  const PAGE = 1000;
  let desde = 0;
  const acc: Record<string, unknown>[] = [];
  for (;;) {
    let q = supabaseAdmin.from(tabla).select(select).range(desde, desde + PAGE - 1);
    if (filtro) q = filtro(q) as typeof q;
    const { data, error } = await q;
    if (error) throw error;
    const lote = data ?? [];
    acc.push(...lote);
    if (lote.length < PAGE) break;
    desde += PAGE;
  }
  return acc;
}

function getDesde(periodo: string): string {
  const d = new Date();
  if (periodo === 'dia')    d.setDate(d.getDate() - 1);
  else if (periodo === 'semana') d.setDate(d.getDate() - 7);
  else if (periodo === 'año')    d.setFullYear(d.getFullYear() - 1);
  else d.setMonth(d.getMonth() - 1); // mes (default)
  return d.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const periodo = request.nextUrl.searchParams.get('periodo') ?? 'mes';
    const desde = getDesde(periodo);

    // Filtro de período aplicado EN LA QUERY (gte created_at) para no traer todo
    const desdePeriodo = (q: ReturnType<ReturnType<typeof supabaseAdmin.from>['select']>) =>
      (q as { gte: (c: string, v: string) => unknown }).gte('created_at', desde) as typeof q;

    // 1. Traer datos ya filtrados por período (clientes/ventas/citas);
    //    propiedades y profiles son pocos → completos para mapear nombres.
    const [clientesP, ventasAll, propiedades, citasP, profiles] = await Promise.all([
      fetchAll('clientes', 'id,etapa,origen,puntuacion_lead,created_at', desdePeriodo),
      fetchAll('ventas', 'id,asesor_id,precio_final,estado,created_at', desdePeriodo),
      fetchAll('propiedades', 'id,direccion,distrito,tipo'),
      fetchAll('citas', 'id,propiedad_id,cliente_id,asesor_id,created_at', desdePeriodo),
      fetchAll('profiles', 'id,nombre,role'),
    ]);

    const propMap = new Map(propiedades.map(p => [p.id, p]));
    const profMap = new Map(profiles.map(p => [p.id, p]));

    const ventasP = ventasAll.filter(v => v.estado !== 'cancelado');

    // 2. KPIs
    const ventasMonto = ventasP.reduce((s, v) => s + Number(v.precio_final ?? 0), 0);
    const totalLeads  = clientesP.length;
    const ventasCount = ventasP.length;
    const conversion  = totalLeads ? Math.round((ventasCount / totalLeads) * 100) : 0;

    // 3. Funnel
    const byEtapa = (e: string) => clientesP.filter(c => c.etapa === e).length;
    const funnel = [
      { label: 'Nuevos Leads',        n: byEtapa('nuevo') + byEtapa('contactado'), color: '#3B82F6' },
      { label: 'Calificados por IA',  n: byEtapa('calificado'),                    color: '#8B5CF6' },
      { label: 'En Negociación',      n: byEtapa('propuesta') + byEtapa('negociacion'), color: '#F59E0B' },
      { label: 'Cerrados / Vendidos', n: byEtapa('cierre') + ventasCount,          color: '#10B981' },
    ];

    // 4. Propiedades más consultadas (por número de citas)
    const consultaCount: Record<string, number> = {};
    citasP.forEach(ci => {
      const pid = ci.propiedad_id as string;
      if (pid) consultaCount[pid] = (consultaCount[pid] ?? 0) + 1;
    });
    const topPropiedades = Object.entries(consultaCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([id, consultas]) => {
        const p = propMap.get(id);
        return {
          propiedad: {
            id,
            direccion: (p?.direccion as string) ?? 'Propiedad sin datos',
            distrito:  (p?.distrito as string) ?? '',
            tipo:      (p?.tipo as string) ?? '',
          },
          consultas,
        };
      });

    // 5. Rendimiento por asesor (desde citas + ventas)
    //    leads asignados = clientes distintos con cita; gestiones = nº de citas
    const asesorData: Record<string, { leadsSet: Set<number>; citas: number; ventas: number; monto: number }> = {};
    const ensure = (aid: string) => {
      if (!asesorData[aid]) asesorData[aid] = { leadsSet: new Set(), citas: 0, ventas: 0, monto: 0 };
      return asesorData[aid];
    };
    citasP.forEach(ci => {
      const aid = ci.asesor_id as string;
      if (!aid) return;
      const a = ensure(aid);
      a.citas += 1;
      if (ci.cliente_id) a.leadsSet.add(ci.cliente_id as number);
    });
    ventasP.forEach(v => {
      const aid = v.asesor_id as string;
      if (!aid) return;
      const a = ensure(aid);
      a.ventas += 1;
      a.monto += Number(v.precio_final ?? 0);
    });

    const asesores = Object.entries(asesorData)
      .map(([aid, d]) => {
        const prof = profMap.get(aid);
        return {
          profile: {
            id: aid,
            nombre: (prof?.nombre as string) ?? 'Asesor desconocido',
            role:   (prof?.role as string) ?? 'asesor',
          },
          leads:        d.leadsSet.size,
          seguimientos: d.citas,
          ventas:       d.ventas,
          monto:        d.monto,
        };
      })
      .sort((a, b) => b.monto - a.monto);

    return NextResponse.json({
      success: true,
      data: {
        periodo,
        totalLeads,
        ventasMonto,
        ventasCount,
        conversion,
        funnel,
        topPropiedades,
        asesores,
      },
    });
  } catch (err) {
    console.error('[GET /api/reportes]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
