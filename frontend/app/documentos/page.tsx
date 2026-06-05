'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FaFileContract, FaFileInvoiceDollar, FaClipboardCheck, FaMagic,
  FaDownload, FaCopy, FaRedo, FaSpinner,
} from 'react-icons/fa';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

type Tipo = 'contrato' | 'proforma' | 'tasacion';

const TIPOS: { id: Tipo; titulo: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: 'contrato',  titulo: 'Contrato de Compra-Venta', desc: 'Genera el contrato desde una venta registrada', icon: <FaFileContract />,     color: '#2563EB' },
  { id: 'proforma',  titulo: 'Proforma / Oferta',         desc: 'Carta comercial para un cliente y propiedad',  icon: <FaFileInvoiceDollar />, color: '#059669' },
  { id: 'tasacion',  titulo: 'Informe de Tasación',       desc: 'Valoración técnica de una propiedad',          icon: <FaClipboardCheck />,    color: '#7C3AED' },
];

interface Opcion { id: string; label: string; }

export default function DocumentosPage() {
  const [tipo, setTipo]         = useState<Tipo | null>(null);
  const [ventas, setVentas]     = useState<Opcion[]>([]);
  const [propiedades, setProps] = useState<Opcion[]>([]);
  const [clientes, setClientes] = useState<Opcion[]>([]);
  const [sel, setSel]           = useState<Record<string, string>>({});
  const [generando, setGen]     = useState(false);
  const [doc, setDoc]           = useState<{ titulo: string; texto: string } | null>(null);
  const [error, setError]       = useState('');
  const [copiado, setCopiado]   = useState(false);

  // Cargar opciones según el tipo
  const cargarOpciones = useCallback(async (t: Tipo) => {
    if (t === 'contrato' && ventas.length === 0) {
      const r = await fetch(`${API}/api/ventas?pageSize=100`).then(r => r.json()).catch(() => null);
      const lista = (r?.data?.ventas ?? []).map((v: Record<string, unknown>) => ({
        id: String(v.id),
        label: `Venta #${v.id} — ${(v.cliente as { nombre?: string })?.nombre ?? 'Cliente'} — S/ ${Number(v.precio_final ?? 0).toLocaleString('es-PE')}`,
      }));
      setVentas(lista);
    }
    if ((t === 'tasacion' || t === 'proforma') && propiedades.length === 0) {
      const r = await fetch(`${API}/api/propiedades?todas=true&pageSize=200`).then(r => r.json()).catch(() => null);
      const lista = (r?.data?.propiedades ?? []).map((p: Record<string, unknown>) => ({
        id: String(p.id), label: `${p.direccion}${p.distrito ? ` · ${p.distrito}` : ''}`,
      }));
      setProps(lista);
    }
    if (t === 'proforma' && clientes.length === 0) {
      // Backend (service role) para evitar el bloqueo RLS de la clave anon
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams({ pageSize: '300' });
      if (session) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (prof?.role === 'asesor') params.set('asesorId', session.user.id);
      }
      const r = await fetch(`${API}/api/clientes?${params}`).then(r => r.json()).catch(() => null);
      setClientes((r?.data?.clientes ?? []).map((c: Record<string, unknown>) => ({ id: String(c.id), label: (c.nombre as string) ?? `Lead #${c.id}` })));
    }
  }, [ventas.length, propiedades.length, clientes.length]);

  useEffect(() => { if (tipo) cargarOpciones(tipo); }, [tipo, cargarOpciones]);

  const generar = async () => {
    if (!tipo) return;
    setGen(true); setError(''); setDoc(null);
    try {
      const res = await fetch(`${API}/api/documentos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, ...sel }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDoc({ titulo: json.data.titulo, texto: json.data.texto });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar');
    } finally {
      setGen(false);
    }
  };

  // Carga el logo de /public (si existe) como base64 para embeberlo en el PDF
  const cargarLogo = async (): Promise<string | null> => {
    for (const ruta of ['/logo_luz_del_sol.jpg', '/logo-luzdelsol.png', '/logo.png', '/logo.jpg']) {
      try {
        const res = await fetch(ruta);
        if (!res.ok) continue;
        const blob = await res.blob();
        return await new Promise(resolve => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.readAsDataURL(blob);
        });
      } catch { /* probar siguiente */ }
    }
    return null;
  };

  const descargarPDF = async () => {
    if (!doc) return;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 20, maxW = W - M * 2;
    const AZUL: [number, number, number] = [30, 64, 175];
    const NARANJA: [number, number, number] = [234, 88, 12];
    const logo = await cargarLogo();

    // ── Membrete (se repite en cada página) ──
    const membrete = () => {
      // Logo (si existe) o iniciales en círculo. Detecta formato del data URL.
      if (logo) {
        const fmt = logo.startsWith('data:image/jpeg') || logo.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
        try { pdf.addImage(logo, fmt, M, 11, 22, 22); } catch { /* formato no soportado */ }
      } else {
        pdf.setFillColor(...AZUL); pdf.circle(M + 10, 22, 10, 'F');
        pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
        pdf.text('LS', M + 6.5, 24);
      }
      // Nombre y datos de la empresa
      pdf.setTextColor(...AZUL); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17);
      pdf.text('LUZ DEL SOL', M + 25, 20);
      pdf.setTextColor(...NARANJA); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5);
      pdf.text('COMPAÑÍA INMOBILIARIA S.A.C.', M + 25, 25.5);
      pdf.setTextColor(100, 116, 139); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
      pdf.text('RUC 20XXXXXXXXX  ·  Trujillo, La Libertad, Perú  ·  info@luzdelsol.com', M + 25, 30);
      // Línea divisoria bicolor (azul + naranja)
      pdf.setDrawColor(...AZUL); pdf.setLineWidth(0.8); pdf.line(M, 35, W - M - 35, 35);
      pdf.setDrawColor(...NARANJA); pdf.line(W - M - 35, 35, W - M, 35);
    };

    // ── Pie de página ──
    const pie = (pag: number) => {
      pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.3); pdf.line(M, H - 16, W - M, H - 16);
      pdf.setTextColor(148, 163, 184); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
      pdf.text('Inmobiliaria Luz del Sol S.A.C. — Documento generado por el sistema', M, H - 11);
      pdf.text(`Página ${pag}`, W - M, H - 11, { align: 'right' });
    };

    let pagina = 1;
    membrete();

    // ── Título del documento en banda ──
    let y = 44;
    pdf.setFillColor(...AZUL); pdf.rect(M, y, maxW, 10, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
    pdf.text(doc.titulo.toUpperCase(), W / 2, y + 6.7, { align: 'center' });
    y += 18;

    // ── Cuerpo del documento ──
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
    const lineas = pdf.splitTextToSize(doc.texto, maxW) as string[];
    lineas.forEach(l => {
      if (y > H - 24) { pie(pagina); pdf.addPage(); pagina++; membrete(); y = 44; }
      // Resaltar líneas que parecen títulos de cláusula (MAYÚSCULAS o **)
      const limpia = l.replace(/\*\*/g, '');
      const esTitulo = /^[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s°.\-:)]{6,}$/.test(limpia.trim()) || /^\d+[).]/.test(limpia.trim());
      if (esTitulo) { pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...AZUL); }
      else { pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30, 30, 30); }
      pdf.text(limpia, M, y); y += 5.3;
    });
    pie(pagina);

    pdf.save(`${doc.titulo.replace(/[^\w]/g, '_')}.pdf`);
  };

  // ¿Se puede generar? (todos los campos requeridos llenos)
  const camposListos = tipo === 'contrato' ? !!sel.ventaId
    : tipo === 'tasacion' ? !!sel.propiedadId
    : tipo === 'proforma' ? (!!sel.clienteId && !!sel.propiedadId)
    : false;

  const Selector = ({ label, opciones, campo }: { label: string; opciones: Opcion[]; campo: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{label}</label>
      <select value={sel[campo] ?? ''} onChange={e => setSel(s => ({ ...s, [campo]: e.target.value }))}
        style={{ padding: '0.6rem 0.8rem', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: '0.85rem', outline: 'none', background: '#fff' }}>
        <option value="">— Seleccionar —</option>
        {opciones.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaMagic style={{ color: '#2563EB' }} /> Automatización Documental
        </h1>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
          Genera contratos, proformas e informes de tasación a partir de los datos del sistema (IA generativa local)
        </p>
      </div>

      {/* Paso 1: tipo */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {TIPOS.map(t => (
          <div key={t.id} onClick={() => { setTipo(t.id); setSel({}); setDoc(null); setError(''); }}
            style={{
              flex: '1 1 220px', background: '#fff', borderRadius: 14, padding: '1.25rem', cursor: 'pointer',
              border: `2px solid ${tipo === t.id ? t.color : '#F1F5F9'}`, transition: 'all .2s',
              boxShadow: tipo === t.id ? `0 4px 16px ${t.color}25` : '0 1px 4px rgba(0,0,0,.05)',
            }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: t.color + '18', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.6rem' }}>
              {t.icon}
            </div>
            <p style={{ margin: 0, fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>{t.titulo}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.76rem', color: '#94A3B8' }}>{t.desc}</p>
          </div>
        ))}
      </div>

      {/* Paso 2: fuente de datos */}
      {tipo && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Selecciona los datos de origen</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {tipo === 'contrato'  && <Selector label="Venta registrada" opciones={ventas} campo="ventaId" />}
            {tipo === 'tasacion'  && <Selector label="Propiedad" opciones={propiedades} campo="propiedadId" />}
            {tipo === 'proforma'  && <>
              <Selector label="Cliente" opciones={clientes} campo="clienteId" />
              <Selector label="Propiedad a ofrecer" opciones={propiedades} campo="propiedadId" />
            </>}
          </div>
          <button onClick={generar} disabled={!camposListos || generando}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem', borderRadius: 9, border: 'none',
              background: (!camposListos || generando) ? '#93C5FD' : '#2563EB', color: '#fff', fontWeight: 700,
              cursor: (!camposListos || generando) ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
            }}>
            {generando ? <><FaSpinner className="doc-spin" /> Generando documento…</> : <><FaMagic /> Generar documento</>}
          </button>
          {generando && <p style={{ margin: '0.6rem 0 0', fontSize: '0.76rem', color: '#94A3B8' }}>La IA está redactando. Puede tardar hasta 1-2 minutos (modelo local).</p>}
          {error && <p style={{ margin: '0.6rem 0 0', fontSize: '0.82rem', color: '#DC2626' }}>⚠️ {error}</p>}
        </div>
      )}

      {/* Resultado */}
      {doc && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>{doc.titulo}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => { navigator.clipboard.writeText(doc.texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                <FaCopy size={12} /> {copiado ? 'Copiado' : 'Copiar'}
              </button>
              <button onClick={generar}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                <FaRedo size={11} /> Regenerar
              </button>
              <button onClick={descargarPDF}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 1rem', border: 'none', borderRadius: 8, background: '#0F172A', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                <FaDownload size={12} /> PDF
              </button>
            </div>
          </div>
          <div style={{ padding: '1.5rem 1.75rem', maxHeight: '60vh', overflowY: 'auto' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: '0.86rem', lineHeight: 1.7, color: '#1E293B' }}>{doc.texto}</pre>
          </div>
        </div>
      )}

      <style>{`.doc-spin{animation:docspin .8s linear infinite;}@keyframes docspin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
