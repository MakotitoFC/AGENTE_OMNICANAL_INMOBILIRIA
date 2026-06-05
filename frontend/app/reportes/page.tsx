'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FaChartBar, FaUsers, FaMoneyBillWave, FaSync,
  FaFilePdf, FaEnvelope, FaTimes, FaCheckCircle, FaExclamationTriangle,
  FaFilter, FaUserTie,
} from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

const API  = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';
const fmt  = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const pct  = (v: number, t: number) => t ? Math.round((v / t) * 100) : 0;
const hoy  = () => new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

type Periodo = 'dia' | 'semana' | 'mes' | 'año';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Propiedad { id: string; direccion: string; distrito?: string; tipo?: string; }
interface Profile   { id: string; nombre: string; role: string; }

interface Stats {
  totalLeads: number;
  ventasMonto: number;
  ventasCount: number;
  conversion: number;
  funnel: { label: string; n: number; color: string }[];
  topPropiedades: { propiedad: Propiedad; consultas: number }[];
  asesores: { profile: Profile; leads: number; seguimientos: number; ventas: number; monto: number }[];
}

// ─── Funnel Chart ─────────────────────────────────────────────────────────────
function FunnelChart({ steps }: { steps: { label: string; n: number; color: string }[] }) {
  const max = steps[0]?.n || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {steps.map((s, i) => {
        const w = Math.max(20, (s.n / max) * 100);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 120, fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textAlign: 'right', flexShrink: 0 }}>
              {s.label}
            </div>
            <div style={{ flex: 1, position: 'relative', height: 36 }}>
              <div style={{
                width: `${w}%`, height: '100%',
                background: s.color, borderRadius: 6, opacity: 1 - i * 0.1,
                display: 'flex', alignItems: 'center', paddingLeft: 10,
                transition: 'width 0.8s ease',
              }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>{s.n}</span>
              </div>
            </div>
            <div style={{ width: 40, fontSize: '0.75rem', color: '#94A3B8', flexShrink: 0 }}>
              {i > 0 && max > 0 ? `${pct(s.n, steps[0].n)}%` : '100%'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 4px rgba(15,23,42,.07)', display: 'flex',
      alignItems: 'center', gap: '1rem', flex: '1 1 200px', minWidth: 180,
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: '1.3rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ margin: '0.15rem 0 0', fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: '#94A3B8' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Modal Email ──────────────────────────────────────────────────────────────
function ModalEmail({ stats, onClose }: { stats: Stats; onClose: () => void }) {
  const [email,  setEmail]  = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg,    setMsg]    = useState('');

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = async () => {
    if (!validEmail) { setMsg('Ingresa un correo válido'); return; }
    setStatus('loading'); setMsg('');

    try {
      // Generar PDF en base64
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; const M = 18;
      const AZUL: [number,number,number] = [37,99,235];
      const BLANCO: [number,number,number] = [255,255,255];
      const OSCURO: [number,number,number] = [15,23,42];

      doc.setFillColor(...AZUL); doc.rect(0, 0, W, 36, 'F');
      doc.setTextColor(...BLANCO); doc.setFont('helvetica','bold'); doc.setFontSize(18);
      doc.text('Inmobiliaria Luz del Sol', M, 15);
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text('Reporte Ejecutivo de Gestión', M, 23);
      doc.setFontSize(8); doc.text(`Generado el ${hoy()}`, M, 30);

      let y = 46;
      const sec = (t: string) => {
        doc.setFillColor(241,245,249); doc.rect(M, y, W-M*2, 8, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...OSCURO);
        doc.text(t, M+3, y+5.5); y += 12;
      };
      const row = (cols: string[], xs: number[], bold=false) => {
        doc.setFont('helvetica', bold?'bold':'normal'); doc.setFontSize(8.5);
        doc.setTextColor(...(bold ? OSCURO : [100,116,139] as [number,number,number]));
        cols.forEach((c,i) => doc.text(c, M+xs[i], y+5));
        doc.setDrawColor(226,232,240); doc.setLineWidth(0.2);
        doc.line(M, y+7, W-M, y+7); y += 7;
      };

      sec('KPIs DEL PERÍODO');
      row(['Total Leads','Ventas Cerradas','Tasa Conversión'],[0,70,130], true);
      row([String(stats.totalLeads), fmt(stats.ventasMonto), `${stats.conversion}%`],[0,70,130]);
      y += 4;

      sec('EMBUDO DE CONVERSIÓN');
      row(['Etapa','Cantidad','%'],[0,80,110], true);
      stats.funnel.forEach(s => row([s.label, String(s.n), `${pct(s.n, stats.funnel[0]?.n||1)}%`],[0,80,110]));
      y += 4;

      sec('RENDIMIENTO POR ASESOR');
      row(['Asesor','Seguimientos','Ventas (Soles)'],[0,80,120], true);
      stats.asesores.forEach(a => row([a.profile.nombre, String(a.seguimientos), fmt(a.monto)],[0,80,120]));

      doc.setFillColor(...AZUL); doc.rect(0, 285, W, 12, 'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...BLANCO);
      doc.text(`Inmobiliaria Luz del Sol — ${hoy()} — Confidencial`, M, 292);

      const pdfBase64  = doc.output('datauristring').split(',')[1];
      const nombreArchivo = `Reporte_LuzDelSol_${new Date().toISOString().slice(0,10)}.pdf`;

      const res = await fetch(`${API}/api/email-reporte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatario: email,
          pdfBase64,
          nombreArchivo,
          resumen: {
            leads: stats.totalLeads,
            ventas: stats.ventasMonto,
            conversion: stats.conversion,
          },
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setStatus('success');
      setMsg(`Reporte enviado a ${email}`);
    } catch (e: unknown) {
      setStatus('error');
      setMsg(e instanceof Error ? e.message : 'Error al enviar');
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,.22)', overflow: 'hidden' }}>
        <div style={{ background: '#2563EB', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fff' }}>
            <FaEnvelope size={16} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Enviar Reporte por Correo</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaTimes size={13} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {status === 'success' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0', textAlign: 'center' }}>
              <FaCheckCircle size={48} style={{ color: '#10B981' }} />
              <h3 style={{ margin: 0, color: '#0F172A' }}>¡Enviado!</h3>
              <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>{msg}</p>
              <button onClick={onClose} style={{ padding: '0.6rem 1.5rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cerrar</button>
            </div>
          ) : (
            <>
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#475569' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#0F172A' }}>📄 El correo incluirá:</p>
                {[
                  `• ${stats.totalLeads} leads captados en el período`,
                  `• Ventas cerradas: ${fmt(stats.ventasMonto)}`,
                  `• Tasa de conversión: ${stats.conversion}%`,
                  `• Embudo de leads por etapa`,
                  `• Tabla de rendimiento por asesor`,
                  `• Archivo PDF adjunto`,
                ].map((l, i) => <p key={i} style={{ margin: '0.15rem 0' }}>{l}</p>)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Destinatario</label>
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setMsg(''); }}
                  placeholder="correo@empresa.com"
                  style={{ padding: '0.65rem 0.9rem', borderRadius: 8, border: `1.5px solid ${status === 'error' ? '#EF4444' : '#E2E8F0'}`, fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' }}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  autoFocus
                />
                {msg && (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <FaExclamationTriangle size={11} /> {msg}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={onClose} style={{ flex: 1, padding: '0.65rem', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button onClick={handleSend} disabled={status === 'loading'}
                  style={{ flex: 2, padding: '0.65rem', border: 'none', borderRadius: 8, background: status === 'loading' ? '#93C5FD' : '#2563EB', color: '#fff', cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                  {status === 'loading'
                    ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> Enviando…</>
                    : <><FaEnvelope size={13} /> Enviar Reporte</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

// ─── Modal confirmar envío al descargar ───────────────────────────────────────
function ModalConfirmEmail({ userEmail, stats, onClose }: {
  userEmail: string; stats: Stats; onClose: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg,    setMsg]    = useState('');

  const handleSend = async () => {
    setStatus('loading');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W=210; const M=18;
      const AZUL:[number,number,number]=[37,99,235];
      const BLANCO:[number,number,number]=[255,255,255];
      const OSCURO:[number,number,number]=[15,23,42];
      const GRIS:[number,number,number]=[100,116,139];
      doc.setFillColor(...AZUL); doc.rect(0,0,W,36,'F');
      doc.setTextColor(...BLANCO); doc.setFont('helvetica','bold'); doc.setFontSize(18);
      doc.text('Inmobiliaria Luz del Sol',M,15);
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text('Reporte Ejecutivo de Gestión',M,23);
      doc.setFontSize(8); doc.text(`Generado el ${hoy()}`,M,30);
      let y=46;
      const sec=(t:string)=>{
        doc.setFillColor(241,245,249); doc.rect(M,y,W-M*2,8,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...OSCURO);
        doc.text(t,M+3,y+5.5); y+=12;
      };
      const row=(cols:string[],xs:number[],bold=false)=>{
        doc.setFont('helvetica',bold?'bold':'normal'); doc.setFontSize(8.5);
        doc.setTextColor(...(bold?OSCURO:GRIS));
        cols.forEach((c,i)=>doc.text(c,M+xs[i],y+5));
        doc.setDrawColor(226,232,240); doc.setLineWidth(0.2); doc.line(M,y+7,W-M,y+7); y+=7;
      };
      sec('KPIs'); row(['Total Leads','Ventas Cerradas','Conversión'],[0,70,130],true);
      row([String(stats.totalLeads),fmt(stats.ventasMonto),`${stats.conversion}%`],[0,70,130]);
      y+=4; sec('EMBUDO'); row(['Etapa','N','%'],[0,80,110],true);
      stats.funnel.forEach(s=>row([s.label,String(s.n),`${pct(s.n,stats.funnel[0]?.n||1)}%`],[0,80,110]));
      if(stats.asesores.length>0){y+=4;sec('ASESORES');row(['Asesor','Ventas(S/)'],[0,90],true);stats.asesores.forEach(a=>row([a.profile.nombre,fmt(a.monto)],[0,90]));}
      doc.setFillColor(...AZUL); doc.rect(0,285,W,12,'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...BLANCO);
      doc.text(`Inmobiliaria Luz del Sol — ${hoy()} — Confidencial`,M,292);
      const pdfBase64=doc.output('datauristring').split(',')[1];

      const res=await fetch(`${API}/api/email-reporte`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          destinatario:userEmail, pdfBase64,
          nombreArchivo:`Reporte_LuzDelSol_${new Date().toISOString().slice(0,10)}.pdf`,
          resumen:{leads:stats.totalLeads,ventas:stats.ventasMonto,conversion:stats.conversion},
        }),
      });
      const data=await res.json();
      if(!data.success) throw new Error(data.error);
      setStatus('success'); setMsg(`Reporte enviado a ${userEmail}`);
    } catch(e:unknown){
      setStatus('error'); setMsg(e instanceof Error?e.message:'Error al enviar');
    }
  };

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',overflow:'hidden'}}>
        <div style={{background:'#2563EB',padding:'1.1rem 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{color:'#fff',fontWeight:700,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <FaEnvelope size={15}/> ¿Enviar reporte por correo?
          </span>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.15)',border:'none',borderRadius:8,width:28,height:28,cursor:'pointer',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <FaTimes size={12}/>
          </button>
        </div>

        <div style={{padding:'1.5rem'}}>
          {status==='success' ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.75rem',textAlign:'center',padding:'0.5rem 0'}}>
              <FaCheckCircle size={40} style={{color:'#10B981'}}/>
              <p style={{margin:0,color:'#0F172A',fontWeight:600}}>¡Enviado!</p>
              <p style={{margin:0,color:'#64748B',fontSize:'0.85rem'}}>{msg}</p>
              <button onClick={onClose} style={{padding:'0.5rem 1.5rem',background:'#2563EB',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>Cerrar</button>
            </div>
          ) : status==='error' ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.75rem',textAlign:'center',padding:'0.5rem 0'}}>
              <FaExclamationTriangle size={36} style={{color:'#EF4444'}}/>
              <p style={{margin:0,color:'#64748B',fontSize:'0.85rem'}}>{msg}</p>
              <div style={{display:'flex',gap:'0.75rem'}}>
                <button onClick={onClose} style={{padding:'0.5rem 1rem',border:'1px solid #E2E8F0',borderRadius:8,background:'#fff',cursor:'pointer'}}>Cerrar</button>
                <button onClick={handleSend} style={{padding:'0.5rem 1rem',background:'#2563EB',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>Reintentar</button>
              </div>
            </div>
          ) : (
            <>
              <p style={{margin:'0 0 1rem',color:'#374151',fontSize:'0.88rem'}}>
                El reporte se está descargando. ¿También lo enviamos a tu correo?
              </p>
              <div style={{background:'#F8FAFC',borderRadius:8,padding:'0.65rem 1rem',marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <FaEnvelope size={13} style={{color:'#2563EB',flexShrink:0}}/>
                <span style={{fontSize:'0.9rem',color:'#0F172A',fontWeight:600}}>{userEmail}</span>
              </div>
              <div style={{display:'flex',gap:'0.75rem'}}>
                <button onClick={onClose} style={{flex:1,padding:'0.65rem',border:'1px solid #E2E8F0',borderRadius:8,background:'#fff',color:'#374151',cursor:'pointer',fontWeight:600,fontSize:'0.85rem'}}>
                  No, gracias
                </button>
                <button onClick={handleSend} disabled={status==='loading'} style={{flex:2,padding:'0.65rem',border:'none',borderRadius:8,background:status==='loading'?'#93C5FD':'#2563EB',color:'#fff',cursor:status==='loading'?'not-allowed':'pointer',fontWeight:700,fontSize:'0.88rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem'}}>
                  {status==='loading'
                    ?<><span style={{width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite',display:'inline-block'}}/>Enviando…</>
                    :<><FaEnvelope size={13}/> Sí, enviar</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [periodo,    setPeriodo]    = useState<Periodo>('mes');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showEmail,  setShowEmail]  = useState(false);
  const [updated,    setUpdated]    = useState('');
  const [userEmail,  setUserEmail]  = useState('');
  const [showConfirmEmail, setShowConfirmEmail] = useState(false);

  // Obtener email del usuario logueado al montar
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setUserEmail(session.user.email);
    });
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // Endpoint backend que calcula todo server-side (con acceso a citas y profiles)
      const res  = await fetch(`${API}/api/reportes?periodo=${periodo}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setStats(json.data as Stats);
      setUpdated(new Date().toLocaleTimeString('es-PE'));
    } catch {
      setError('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handlePDF = async () => {
    if (!stats) return;
    setPdfLoading(true);
    // Mostrar modal de confirmación de email al mismo tiempo que descarga
    if (userEmail) setShowConfirmEmail(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210; const M = 18; const COL = W - M * 2;
      const AZUL:   [number,number,number] = [37,99,235];
      const BLANCO: [number,number,number] = [255,255,255];
      const OSCURO: [number,number,number] = [15,23,42];
      const GRIS:   [number,number,number] = [100,116,139];
      const GBKG:   [number,number,number] = [248,250,252];
      let y = 0;

      // Header
      doc.setFillColor(...AZUL); doc.rect(0, 0, W, 38, 'F');
      doc.setTextColor(...BLANCO); doc.setFont('helvetica','bold'); doc.setFontSize(18);
      doc.text('Inmobiliaria Luz del Sol', M, 16);
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text('Reporte Ejecutivo de Gestión', M, 24);
      doc.setFontSize(8.5); doc.text(`${hoy()} — Período: ${periodo.toUpperCase()}`, M, 31);
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('CONFIDENCIAL', W-M-27, 16);
      y = 48;

      const sec = (t: string) => {
        doc.setFillColor(...GBKG); doc.rect(M, y, COL, 8, 'F');
        doc.setDrawColor(...AZUL); doc.setLineWidth(0.6); doc.line(M, y, M, y+8);
        doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...OSCURO);
        doc.text(t, M+4, y+5.5); y += 12;
      };

      const fila = (cols: string[], xs: number[], bold = false) => {
        const H = 7;
        doc.setFont('helvetica', bold?'bold':'normal'); doc.setFontSize(8.5);
        doc.setTextColor(...(bold ? OSCURO : GRIS));
        cols.forEach((c, i) => doc.text(c, M+xs[i], y+5));
        doc.setDrawColor(226,232,240); doc.setLineWidth(0.2);
        doc.line(M, y+H, M+COL, y+H); y += H;
      };

      // KPIs
      sec('INDICADORES CLAVE — ' + periodo.toUpperCase());
      const kpis = [
        { l: 'Total Leads Captados', v: String(stats.totalLeads) },
        { l: 'Ventas Cerradas',      v: fmt(stats.ventasMonto) },
        { l: 'Tasa de Conversión',   v: `${stats.conversion}%` },
      ];
      kpis.forEach((k, i) => {
        const X = M + (i % 2) * (COL/2+2); const bW = COL/2-2;
        if (i === 2) { y += 2; }
        if (i % 2 === 0 && i > 0) y += 20;
        doc.setFillColor(239,246,255); doc.setDrawColor(191,219,254); doc.setLineWidth(0.3);
        doc.roundedRect(X, y, bW, 16, 2, 2, 'FD');
        doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(...AZUL);
        doc.text(k.v, X+4, y+10);
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...OSCURO);
        doc.text(k.l, X+4, y+14);
        if (i%2===1) y += 20;
      });
      if (kpis.length % 2 !== 0) y += 20;
      y += 4;

      // Funnel
      sec('EMBUDO DE CONVERSIÓN');
      fila(['Etapa','Cantidad','% Retención'],[0,80,115], true);
      stats.funnel.forEach(s => fila([s.label, String(s.n), `${pct(s.n, stats.funnel[0]?.n||1)}%`],[0,80,115]));
      y += 4;

      // Top propiedades
      if (stats.topPropiedades.length > 0) {
        sec('PROPIEDADES MÁS CONSULTADAS');
        fila(['Propiedad','Consultas'],[0,120], true);
        stats.topPropiedades.forEach(p => {
          const dir = p.propiedad.direccion.length > 45 ? p.propiedad.direccion.slice(0,45)+'…' : p.propiedad.direccion;
          fila([dir, String(p.consultas)],[0,120]);
        });
        y += 4;
      }

      // Rendimiento asesores
      if (stats.asesores.length > 0) {
        sec('RENDIMIENTO POR ASESOR');
        fila(['Asesor','Seguimientos','Ventas (Soles)'],[0,80,120], true);
        stats.asesores.forEach(a => fila([a.profile.nombre, String(a.seguimientos), fmt(a.monto)],[0,80,120]));
        y += 4;
      }

      // Footer
      doc.setFillColor(...AZUL); doc.rect(0, 285, W, 12, 'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...BLANCO);
      doc.text('Inmobiliaria Luz del Sol — Trujillo, La Libertad, Perú', M, 292);
      doc.text(`${hoy()} — Confidencial`, W-M, 292, { align: 'right' });

      doc.save(`Reporte_LuzDelSol_${periodo}_${new Date().toISOString().slice(0,10)}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', gap:'0.75rem', color:'#64748B' }}>
      <div style={{ width:28, height:28, border:'3px solid #E2E8F0', borderTopColor:'#2563EB', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      Cargando métricas…
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'50vh', gap:'1rem', color:'#64748B', textAlign:'center' }}>
      <FaExclamationTriangle size={32} style={{ color:'#F59E0B', opacity:.7 }} />
      <p style={{ maxWidth:380 }}>{error}</p>
      <button onClick={fetchStats} style={{ padding:'0.5rem 1.25rem', background:'#2563EB', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>Reintentar</button>
    </div>
  );

  if (!stats) return null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.35rem', fontWeight:800, color:'#0F172A', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <FaChartBar style={{ color:'#2563EB' }} /> Reportes y Métricas
          </h1>
          {updated && <p style={{ margin:'0.2rem 0 0', fontSize:'0.75rem', color:'#94A3B8' }}>Actualizado: {updated}</p>}
        </div>
        <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
          <button onClick={fetchStats} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.55rem 1rem', background:'#F8FAFC', color:'#475569', border:'1px solid #E2E8F0', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}>
            <FaSync size={12} /> Actualizar
          </button>
          <button onClick={handlePDF} disabled={pdfLoading} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.55rem 1.1rem', background: pdfLoading ? '#94A3B8' : '#0F172A', color:'#fff', border:'none', borderRadius:8, cursor: pdfLoading ? 'not-allowed' : 'pointer', fontSize:'0.82rem', fontWeight:700 }}>
            {pdfLoading
              ? <><span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }} /> Generando…</>
              : <><FaFilePdf size={13} /> Descargar PDF</>}
          </button>
        </div>
      </div>

      {/* Filtro período */}
      <div style={{ background:'#fff', borderRadius:12, padding:'0.85rem 1.25rem', boxShadow:'0 1px 4px rgba(15,23,42,.06)', display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
        <span style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.82rem', fontWeight:700, color:'#64748B' }}>
          <FaFilter size={12} /> Período:
        </span>
        {(['dia','semana','mes','año'] as Periodo[]).map(p => (
          <button key={p} onClick={() => setPeriodo(p)} style={{
            padding:'0.4rem 1rem', borderRadius:8, border:'1.5px solid', cursor:'pointer', fontSize:'0.82rem', fontWeight:600,
            borderColor: periodo===p ? '#2563EB' : '#E2E8F0',
            background:  periodo===p ? '#EFF6FF' : '#fff',
            color:       periodo===p ? '#2563EB' : '#64748B',
          }}>
            {p === 'dia' ? 'Hoy' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año'}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
        <KpiCard icon={<FaUsers />}        label="Total Leads Captados"  value={String(stats.totalLeads)}   sub={`período: ${periodo}`}                                    color="#2563EB" />
        <KpiCard icon={<FaMoneyBillWave />} label="Ventas Cerradas"      value={fmt(stats.ventasMonto)}     sub={`${stats.ventasCount} venta${stats.ventasCount!==1?'s':''} concretada${stats.ventasCount!==1?'s':''}`} color="#059669" />
        <KpiCard icon={<FaChartBar />}     label="Tasa de Conversión"    value={`${stats.conversion}%`}     sub="leads → venta cerrada"                                    color="#7C3AED" />
      </div>

      {/* Fila: Funnel + Top propiedades */}
      <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap' }}>

        {/* Funnel */}
        <div style={{ background:'#fff', borderRadius:14, padding:'1.5rem', boxShadow:'0 1px 4px rgba(15,23,42,.06)', flex:'1 1 320px' }}>
          <h3 style={{ margin:'0 0 1.25rem', fontSize:'0.9rem', fontWeight:700, color:'#0F172A' }}>
            🔻 Embudo de Conversión
          </h3>
          <FunnelChart steps={stats.funnel} />
          {stats.totalLeads === 0 && (
            <p style={{ textAlign:'center', color:'#94A3B8', fontSize:'0.82rem', marginTop:'1rem' }}>Sin leads en el período seleccionado</p>
          )}
        </div>

        {/* Top propiedades */}
        <div style={{ background:'#fff', borderRadius:14, padding:'1.5rem', boxShadow:'0 1px 4px rgba(15,23,42,.06)', flex:'1 1 320px' }}>
          <h3 style={{ margin:'0 0 1.25rem', fontSize:'0.9rem', fontWeight:700, color:'#0F172A' }}>
            🏠 Propiedades más Consultadas
          </h3>
          {stats.topPropiedades.length === 0 ? (
            <p style={{ color:'#94A3B8', fontSize:'0.82rem', textAlign:'center', padding:'2rem 0' }}>Sin datos de consultas en el período</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {stats.topPropiedades.map((p, i) => {
                const maxC = stats.topPropiedades[0].consultas;
                return (
                  <div key={p.propiedad.id}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.2rem' }}>
                      <span style={{ fontSize:'0.76rem', color:'#374151', fontWeight:600 }} title={p.propiedad.direccion}>
                        {p.propiedad.direccion.length > 32 ? p.propiedad.direccion.slice(0,32)+'…' : p.propiedad.direccion}
                        {p.propiedad.distrito && <span style={{ color:'#94A3B8', fontWeight:500 }}> · {p.propiedad.distrito}</span>}
                      </span>
                      <span style={{ fontSize:'0.76rem', color:'#64748B', flexShrink:0, marginLeft:'0.5rem' }}>{p.consultas} {p.consultas===1?'consulta':'consultas'}</span>
                    </div>
                    <div style={{ height:7, background:'#F1F5F9', borderRadius:100, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct(p.consultas, maxC)}%`, background: i===0 ? '#2563EB' : '#93C5FD', borderRadius:100, transition:'width .6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tabla rendimiento asesores */}
      <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 4px rgba(15,23,42,.06)', overflow:'hidden' }}>
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <FaUserTie style={{ color:'#2563EB' }} />
          <h3 style={{ margin:0, fontSize:'0.9rem', fontWeight:700, color:'#0F172A' }}>Rendimiento por Asesor</h3>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.88rem' }}>
          <thead>
            <tr style={{ background:'#F8FAFC' }}>
              {['Asesor','Leads Asignados','Seguimientos','Ventas Concretadas (S/)'].map(h => (
                <th key={h} style={{ padding:'0.75rem 1.25rem', textAlign:'left', fontSize:'0.72rem', fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.asesores.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding:'3rem', textAlign:'center', color:'#94A3B8', fontSize:'0.85rem' }}>
                  Sin datos de asesores para el período seleccionado
                </td>
              </tr>
            ) : stats.asesores.map((a, i) => (
              <tr key={a.profile.id} style={{ borderBottom:'1px solid #F8FAFC', background: i%2===0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding:'0.9rem 1.25rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'#EFF6FF', color:'#2563EB', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.85rem', flexShrink:0 }}>
                      {a.profile.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight:600, color:'#0F172A' }}>{a.profile.nombre}</span>
                  </div>
                </td>
                <td style={{ padding:'0.9rem 1.25rem', color:'#475569' }}>{a.leads || '—'}</td>
                <td style={{ padding:'0.9rem 1.25rem', color:'#475569' }}>{a.seguimientos || '—'}</td>
                <td style={{ padding:'0.9rem 1.25rem' }}>
                  <span style={{ fontWeight:700, color: a.monto > 0 ? '#059669' : '#94A3B8' }}>
                    {a.monto > 0 ? fmt(a.monto) : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEmail && stats && <ModalEmail stats={stats} onClose={() => setShowEmail(false)} />}
      {showConfirmEmail && stats && userEmail && (
        <ModalConfirmEmail
          userEmail={userEmail}
          stats={stats}
          onClose={() => setShowConfirmEmail(false)}
        />
      )}
    </div>
  );
}
