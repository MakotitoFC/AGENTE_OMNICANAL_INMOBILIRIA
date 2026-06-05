'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FaFire, FaThermometerHalf, FaSnowflake, FaSync, FaUserCheck,
  FaExclamationTriangle, FaServer, FaPhone,
} from 'react-icons/fa';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

interface Lead {
  id: number; nombre?: string; telefono?: string;
  etapa: string; origen: string;
  presupuesto_max?: number; tipo_preferido?: string[]; distritos_preferidos?: string[];
  num_seguimientos: number; dias_inactivo: number;
  probabilidad: number; probabilidad_pct: number;
  clasificacion: 'caliente' | 'tibio' | 'frio'; factores: string[];
}
interface Data {
  calificados: Lead[];
  resumen: { total: number; caliente: number; tibio: number; frio: number };
  ml_disponible: boolean;
}

const CLASE = {
  caliente: { label: 'Caliente', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', icon: <FaFire />,            desc: 'Alta intención de compra' },
  tibio:    { label: 'Tibio',    color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', icon: <FaThermometerHalf />, desc: 'Requiere seguimiento' },
  frio:     { label: 'Frío',     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: <FaSnowflake />,       desc: 'Baja intención por ahora' },
};
const ETAPA_COLOR: Record<string, string> = {
  nuevo:'#3B82F6', contactado:'#8B5CF6', calificado:'#06B6D4',
  propuesta:'#F59E0B', negociacion:'#F97316', cierre:'#10B981',
};
const fmtS = (n?: number) => (n ? `S/ ${n.toLocaleString('es-PE')}` : '—');

export default function CalificacionPage() {
  const [data, setData]       = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filtro, setFiltro]   = useState<'todos' | 'caliente' | 'tibio' | 'frio'>('todos');
  const [rol, setRol]         = useState<string>('asesor');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // Sesión → asesor ve solo sus leads
      const { data: { session } } = await supabase.auth.getSession();
      let asesorId = '';
      let role = 'asesor';
      if (session) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        role = prof?.role ?? 'asesor';
        if (role === 'asesor') asesorId = session.user.id;
      }
      setRol(role);
      const url = asesorId ? `${API}/api/calificacion-leads?asesorId=${asesorId}` : `${API}/api/calificacion-leads`;
      const res  = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', gap:'0.75rem', color:'#64748B' }}>
      <div style={{ width:28, height:28, border:'3px solid #E2E8F0', borderTopColor:'#2563EB', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      Calificando leads con el modelo…
    </div>
  );

  if (error || !data) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'50vh', gap:'1rem', color:'#64748B', textAlign:'center' }}>
      <FaExclamationTriangle size={32} style={{ color:'#F59E0B' }} />
      <p>{error || 'Sin datos'}</p>
      <button onClick={fetchData} style={{ padding:'0.5rem 1.25rem', background:'#2563EB', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>Reintentar</button>
    </div>
  );

  const r = data.resumen;
  const lista = (filtro === 'todos' ? data.calificados : data.calificados.filter(c => c.clasificacion === filtro)).slice(0, 100);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.35rem', fontWeight:800, color:'#0F172A', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <FaUserCheck style={{ color:'#2563EB' }} /> Calificación de Leads
          </h1>
          <p style={{ margin:'0.2rem 0 0', fontSize:'0.78rem', color:'#94A3B8' }}>
            {r.total} leads clasificados por probabilidad de cierre (modelo GradientBoosting)
            {rol === 'asesor' && ' · solo tus leads asignados'}
          </p>
        </div>
        <button onClick={fetchData} style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.55rem 1rem', background:'#F8FAFC', color:'#475569', border:'1px solid #E2E8F0', borderRadius:8, cursor:'pointer', fontSize:'0.82rem', fontWeight:600 }}>
          <FaSync size={12} /> Actualizar
        </button>
      </div>

      {!data.ml_disponible && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:10, padding:'0.75rem 1rem', display:'flex', alignItems:'center', gap:'0.6rem', color:'#991B1B', fontSize:'0.82rem' }}>
          <FaServer /> <span>El modelo (puerto 8000) no responde. Inicia <code>python main.py</code> en <code>backend/ml-service</code>.</span>
        </div>
      )}

      {/* Tarjetas de clasificación */}
      <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
        {(['caliente','tibio','frio'] as const).map(k => {
          const c = CLASE[k];
          return (
            <div key={k} onClick={() => setFiltro(f => f===k?'todos':k)} style={{
              flex:'1 1 180px', background:'#fff', borderRadius:14, padding:'1.25rem 1.5rem', cursor:'pointer',
              border:`2px solid ${filtro===k ? c.color : c.border}`, transition:'all .2s',
              boxShadow: filtro===k ? `0 4px 16px ${c.color}30` : '0 1px 4px rgba(0,0,0,.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.5rem', color:c.color }}>
                <span style={{ fontSize:'1.2rem' }}>{c.icon}</span>
                <span style={{ fontWeight:700, fontSize:'0.9rem' }}>{c.label}</span>
              </div>
              <p style={{ margin:0, fontSize:'2.2rem', fontWeight:800, color:'#0F172A', lineHeight:1 }}>{r[k]}</p>
              <p style={{ margin:'0.3rem 0 0', fontSize:'0.74rem', color:'#94A3B8' }}>{c.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
        {([['todos','Todos',r.total],['caliente','🔥 Calientes',r.caliente],['tibio','🌡️ Tibios',r.tibio],['frio','❄️ Fríos',r.frio]] as const).map(([v,l,n]) => (
          <button key={v} onClick={() => setFiltro(v)} style={{
            padding:'0.4rem 0.9rem', borderRadius:8, border:'1.5px solid', cursor:'pointer', fontSize:'0.82rem', fontWeight:600,
            borderColor: filtro===v ? '#2563EB' : '#E2E8F0',
            background: filtro===v ? '#EFF6FF' : '#fff',
            color: filtro===v ? '#2563EB' : '#64748B' }}>
            {l} <span style={{ background:'#F1F5F9', color:'#64748B', borderRadius:100, padding:'0 0.35rem', fontSize:'0.72rem', marginLeft:'0.25rem' }}>{n}</span>
          </button>
        ))}
      </div>

      {/* Tabla de leads calificados */}
      <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 4px rgba(0,0,0,.06)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.88rem' }}>
          <thead>
            <tr style={{ background:'#F8FAFC' }}>
              {['#','Lead','Etapa','Prob. cierre','Clasificación','Factores clave','Contacto'].map(h => (
                <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.72rem', fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:'3rem', textAlign:'center', color:'#94A3B8' }}>No hay leads en esta clasificación</td></tr>
            ) : lista.map((c, i) => {
              const cl = CLASE[c.clasificacion];
              return (
                <tr key={c.id} style={{ borderBottom:'1px solid #F8FAFC', background: i%2===0?'#fff':'#FAFAFA' }}>
                  <td style={{ padding:'0.8rem 1rem', color:'#94A3B8', fontWeight:700 }}>{i+1}</td>
                  <td style={{ padding:'0.8rem 1rem' }}>
                    <div style={{ fontWeight:600, color:'#0F172A' }}>{c.nombre ?? `Lead #${c.id}`}</div>
                    <div style={{ fontSize:'0.74rem', color:'#94A3B8' }}>{fmtS(c.presupuesto_max)}{c.tipo_preferido?.[0] ? ` · ${c.tipo_preferido[0]}` : ''}</div>
                  </td>
                  <td style={{ padding:'0.8rem 1rem' }}>
                    <span style={{ background:(ETAPA_COLOR[c.etapa]??'#94A3B8')+'20', color:ETAPA_COLOR[c.etapa]??'#94A3B8', padding:'0.15rem 0.55rem', borderRadius:100, fontSize:'0.72rem', fontWeight:700, textTransform:'capitalize' }}>{c.etapa}</span>
                  </td>
                  <td style={{ padding:'0.8rem 1rem', minWidth:130 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <div style={{ flex:1, height:7, background:'#F1F5F9', borderRadius:100, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${c.probabilidad_pct}%`, background:cl.color, borderRadius:100 }} />
                      </div>
                      <span style={{ fontWeight:800, color:cl.color, fontSize:'0.85rem', minWidth:38, textAlign:'right' }}>{c.probabilidad_pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:'0.8rem 1rem' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', background:cl.bg, color:cl.color, border:`1px solid ${cl.border}`, padding:'0.2rem 0.6rem', borderRadius:100, fontSize:'0.72rem', fontWeight:700 }}>
                      {cl.icon} {cl.label}
                    </span>
                  </td>
                  <td style={{ padding:'0.8rem 1rem', maxWidth:260 }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'0.25rem' }}>
                      {c.factores.slice(0,3).map((f,j) => (
                        <span key={j} style={{ background:'#F1F5F9', color:'#475569', padding:'0.1rem 0.45rem', borderRadius:6, fontSize:'0.68rem' }}>{f}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:'0.8rem 1rem' }}>
                    {c.telefono && (
                      <a href={`tel:${c.telefono}`} style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', color:'#2563EB', textDecoration:'none', fontSize:'0.78rem', fontWeight:600 }}>
                        <FaPhone size={10} /> {c.telefono}
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 100 && (
          <p style={{ textAlign:'center', padding:'0.75rem', color:'#94A3B8', fontSize:'0.78rem' }}>Mostrando los 100 de mayor probabilidad</p>
        )}
      </div>

      <style>{`code{background:#FEE2E2;padding:0 .25rem;border-radius:3px;}`}</style>
    </div>
  );
}
