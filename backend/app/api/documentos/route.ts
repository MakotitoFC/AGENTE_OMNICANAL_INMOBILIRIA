import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ─── ÁREA 5: Automatización Documental (NLP / generación con LLM local) ────────
// Genera contratos, proformas e informes de tasación a partir de los datos
const OLLAMA_URL   = process.env.OLLAMA_URL   ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_DOC_MODEL ?? 'qwen2.5:3b';

type TipoDoc = 'contrato' | 'proforma' | 'tasacion';

const fmtS = (n?: number, m = 'PEN') => (n ? `${m === 'PEN' ? 'S/' : '$'} ${Number(n).toLocaleString('es-PE')}` : '—');
const fecha = (iso?: string) => iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-PE');

const EMPRESA = 'Inmobiliaria Luz del Sol S.A.C. (RUC 20XXXXXXXXX), con domicilio en Trujillo, La Libertad, Perú';

// ─── Construcción de prompts por tipo de documento ────────────────────────────
async function construirPrompt(tipo: TipoDoc, params: Record<string, string>): Promise<{ prompt: string; titulo: string } | { error: string }> {
  if (tipo === 'contrato') {
    const { data: venta } = await supabaseAdmin.from('ventas').select('*').eq('id', params.ventaId).single();
    if (!venta) return { error: 'Venta no encontrada' };
    const [{ data: cli }, { data: prop }] = await Promise.all([
      supabaseAdmin.from('clientes').select('nombre,telefono,email').eq('id', venta.cliente_id).single(),
      supabaseAdmin.from('propiedades').select('direccion,distrito,tipo,area_m2').eq('id', venta.propiedad_id).single(),
    ]);
    const datos = `
- VENDEDOR: ${EMPRESA}.
- COMPRADOR: ${cli?.nombre ?? 'Cliente'}, identificado con DNI N° __________, teléfono ${cli?.telefono ?? '—'}, correo ${cli?.email ?? '—'}.
- INMUEBLE: ${prop?.tipo ?? 'terreno'} ubicado en ${prop?.direccion ?? '—'}, distrito de ${prop?.distrito ?? '—'}, provincia de Trujillo, con un área de ${prop?.area_m2 ?? '__'} m².
- PRECIO TOTAL: ${fmtS(venta.precio_final, 'PEN')}.
- FORMA DE PAGO: ${venta.tipo_pago}${venta.num_cuotas > 1 ? ` en ${venta.num_cuotas} cuotas` : ' al contado'}.
- FECHA: ${fecha(venta.fecha_venta)}.`;
    return {
      titulo: `Contrato de Compra-Venta — ${cli?.nombre ?? 'Cliente'}`,
      prompt: `Eres un asistente legal de una inmobiliaria en Trujillo, Perú. Redacta un CONTRATO DE COMPRA-VENTA de bien inmueble, formal y profesional, en español, conforme a la práctica notarial peruana. Incluye cláusulas numeradas: PRIMERA (partes/antecedentes), SEGUNDA (objeto/descripción del inmueble), TERCERA (precio y forma de pago), CUARTA (saneamiento por evicción y vicios ocultos), QUINTA (entrega del bien), SEXTA (gastos e impuestos), SÉTIMA (domicilio y jurisdicción - competencia de los jueces de Trujillo). Cierra con espacios de firma para vendedor y comprador.

Usa estos datos reales:${datos}

Donde falte un dato exacto (DNI, partida registral), deja una línea en blanco "__________" para completar a mano. Redacta el contrato completo.`,
    };
  }

  if (tipo === 'proforma') {
    const [{ data: cli }, { data: prop }] = await Promise.all([
      supabaseAdmin.from('clientes').select('nombre,telefono').eq('id', params.clienteId).single(),
      supabaseAdmin.from('propiedades').select('direccion,distrito,tipo,area_m2,dormitorios,precio,precio_venta,moneda').eq('id', params.propiedadId).single(),
    ]);
    if (!cli || !prop) return { error: 'Cliente o propiedad no encontrados' };
    const precio = prop.precio_venta ?? prop.precio;
    const datos = `
- CLIENTE: ${cli.nombre}, teléfono ${cli.telefono ?? '—'}.
- PROPIEDAD: ${prop.tipo} en ${prop.direccion}, ${prop.distrito ?? ''}, ${prop.area_m2 ?? '__'} m²${prop.dormitorios ? `, ${prop.dormitorios} dormitorios` : ''}.
- PRECIO: ${fmtS(precio, prop.moneda)}.
- EMPRESA: ${EMPRESA}.
- FECHA: ${fecha()}.`;
    return {
      titulo: `Proforma — ${cli.nombre}`,
      prompt: `Eres un asesor comercial de una inmobiliaria en Trujillo. Redacta una PROFORMA / CARTA DE OFERTA COMERCIAL formal, cordial y persuasiva, en español peruano, dirigida al cliente por su nombre, presentando la propiedad. Incluye: encabezado con datos de la empresa y fecha, saludo, descripción atractiva del inmueble, precio, condiciones de financiamiento disponibles, validez de la oferta (15 días), y una invitación a agendar una visita. Tono profesional pero cercano.

Datos:${datos}

Redacta la proforma completa.`,
    };
  }

  // tasacion
  const { data: prop } = await supabaseAdmin.from('propiedades')
    .select('direccion,distrito,tipo,area_m2,dormitorios,precio,precio_venta,moneda,descripcion').eq('id', params.propiedadId).single();
  if (!prop) return { error: 'Propiedad no encontrada' };
  const precio = prop.precio_venta ?? prop.precio;
  const precioM2 = prop.area_m2 ? Math.round(Number(precio) / Number(prop.area_m2)) : 0;
  const datos = `
- INMUEBLE: ${prop.tipo} en ${prop.direccion}, distrito de ${prop.distrito ?? '—'}, Trujillo.
- ÁREA: ${prop.area_m2 ?? '__'} m².${prop.dormitorios ? ` Dormitorios: ${prop.dormitorios}.` : ''}
- VALOR COMERCIAL ESTIMADO: ${fmtS(precio, prop.moneda)}.
- VALOR POR m²: ${fmtS(precioM2, prop.moneda)}.
- DESCRIPCIÓN: ${prop.descripcion ?? 'Sin descripción adicional.'}
- ENTIDAD: ${EMPRESA}.
- FECHA: ${fecha()}.`;
  return {
    titulo: `Informe de Tasación — ${prop.direccion}`,
    prompt: `Eres un perito tasador inmobiliario en Trujillo, Perú. Redacta un INFORME DE TASACIÓN profesional, en español, con secciones numeradas: 1) Datos generales del inmueble, 2) Características físicas, 3) Análisis de la zona y entorno, 4) Metodología de valoración (enfoque de mercado/comparativo), 5) Valor comercial estimado y valor por m², 6) Conclusiones y observaciones. Sé técnico y objetivo.

Datos:${datos}

Redacta el informe completo.`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { tipo: TipoDoc } & Record<string, string>;
    const { tipo, ...params } = body;
    if (!tipo) return NextResponse.json({ success: false, error: 'Falta el tipo de documento' }, { status: 400 });

    const armado = await construirPrompt(tipo, params);
    if ('error' in armado) return NextResponse.json({ success: false, error: armado.error }, { status: 404 });

    let texto = '';
    try {
      const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: armado.prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 900 },
        }),
        signal: AbortSignal.timeout(150000), // documentos largos pueden tardar
      });
      if (!resp.ok) throw new Error(`Ollama ${resp.status}`);
      const j = await resp.json();
      texto = (j.response ?? '').trim();
    } catch {
      return NextResponse.json(
        { success: false, error: 'No se pudo generar (Ollama en localhost:11434). Verifica que esté corriendo.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, data: { tipo, titulo: armado.titulo, texto, modelo: OLLAMA_MODEL } });
  } catch (err) {
    console.error('[POST /api/documentos]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
