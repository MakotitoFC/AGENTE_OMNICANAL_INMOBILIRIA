import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ─── ÁREA 3: Recomendación Personalizada (motor de matching) ──────────────────
// Cruza el perfil del cliente (tipo, zona, presupuesto) con el inventario
// disponible y devuelve las propiedades más relevantes, con explicación.
// Técnica: filtrado basado en contenido (content-based).

interface Propiedad {
  id: string; direccion: string; distrito?: string; tipo?: string;
  area_m2?: number; dormitorios?: number;
  precio?: number; precio_venta?: number; moneda?: string;
  estado?: string; activo?: boolean; imagenes?: string[] | null;
}

interface Cliente {
  id: number; nombre?: string; etapa?: string;
  presupuesto_min?: number; presupuesto_max?: number;
  tipo_preferido?: string[]; distritos_preferidos?: string[];
}

// Calcula la afinidad (0-100) entre un cliente y una propiedad + razones
function matchear(c: Cliente, p: Propiedad): { score: number; razones: string[] } {
  let score = 0;
  const razones: string[] = [];
  const precio = Number(p.precio_venta ?? p.precio ?? 0);
  const presuMin = Number(c.presupuesto_min ?? 0);
  const presuMax = Number(c.presupuesto_max ?? 0);

  // 1. Tipo de propiedad preferido (peso 30)
  const tipos = c.tipo_preferido ?? [];
  if (tipos.length && p.tipo && tipos.includes(p.tipo)) {
    score += 30;
    razones.push(`Tipo coincide: ${p.tipo}`);
  }

  // 2. Distrito preferido (peso 25)
  const distritos = c.distritos_preferidos ?? [];
  if (distritos.length && p.distrito && distritos.includes(p.distrito)) {
    score += 25;
    razones.push(`Distrito preferido: ${p.distrito}`);
  }

  // 3. Ajuste de presupuesto (peso 35)
  if (presuMax > 0 && precio > 0) {
    if (precio <= presuMax && precio >= presuMin) {
      score += 35;
      razones.push('Dentro del presupuesto');
    } else if (precio <= presuMax * 1.10) {
      score += 18;
      razones.push('Ligeramente sobre el presupuesto');
    } else if (precio < presuMin) {
      score += 12;
      razones.push('Por debajo del presupuesto');
    }
  } else if (presuMax === 0) {
    // Sin presupuesto definido → no penaliza, da algo de base
    score += 8;
  }

  // 4. Bonus pequeño por tener foto (mejor presentación)
  if (p.imagenes && p.imagenes.length) { score += 5; }

  // 5. Si el cliente no tiene NINGUNA preferencia, score base por disponibilidad
  if (!tipos.length && !distritos.length && presuMax === 0) {
    score = Math.max(score, 20);
    if (!razones.length) razones.push('Disponible (cliente sin preferencias definidas)');
  }

  return { score: Math.min(100, score), razones };
}

export async function GET(request: NextRequest) {
  try {
    const clienteId = request.nextUrl.searchParams.get('clienteId');
    if (!clienteId) {
      return NextResponse.json({ success: false, error: 'Falta clienteId' }, { status: 400 });
    }

    // 1. Cliente + propiedades disponibles
    const [{ data: cliente }, { data: propiedades }] = await Promise.all([
      supabaseAdmin.from('clientes')
        .select('id,nombre,etapa,presupuesto_min,presupuesto_max,tipo_preferido,distritos_preferidos')
        .eq('id', clienteId).single(),
      supabaseAdmin.from('propiedades')
        .select('id,direccion,distrito,tipo,area_m2,dormitorios,precio,precio_venta,moneda,estado,activo,imagenes')
        .eq('estado', 'disponible').eq('activo', true).range(0, 9999),
    ]);

    if (!cliente) {
      return NextResponse.json({ success: false, error: 'Cliente no encontrado' }, { status: 404 });
    }

    // 2. Calcular match de cada propiedad y ordenar
    const recomendaciones = (propiedades ?? [])
      .map((p: Propiedad) => {
        const { score, razones } = matchear(cliente as Cliente, p);
        return {
          propiedad: {
            id: p.id, direccion: p.direccion, distrito: p.distrito, tipo: p.tipo,
            area_m2: p.area_m2, dormitorios: p.dormitorios,
            precio: p.precio_venta ?? p.precio, moneda: p.moneda ?? 'PEN',
            imagen: p.imagenes?.[0] ?? null,
          },
          match: score,
          razones,
        };
      })
      .filter(r => r.match > 0)
      .sort((a, b) => b.match - a.match)
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      data: {
        cliente,
        total_inventario: propiedades?.length ?? 0,
        recomendaciones,
      },
    });
  } catch (err) {
    console.error('[GET /api/recomendaciones]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
