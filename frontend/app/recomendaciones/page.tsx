'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  FaMagic, FaSearch, FaHome, FaMapMarkerAlt, FaRulerCombined, FaBed,
  FaUser, FaExclamationTriangle,
} from 'react-icons/fa';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

interface ClienteLite { id: number; nombre?: string; etapa?: string; telefono?: string; }
interface PropRec {
  propiedad: {
    id: string; direccion: string; distrito?: string; tipo?: string;
    area_m2?: number; dormitorios?: number; precio?: number; moneda?: string; imagen?: string | null;
  };
  match: number; razones: string[];
}
interface RecData {
  cliente: { id: number; nombre?: string; etapa?: string; presupuesto_min?: number; presupuesto_max?: number; tipo_preferido?: string[]; distritos_preferidos?: string[]; };
  total_inventario: number;
  recomendaciones: PropRec[];
}

const fmtS = (n?: number, m = 'PEN') => (n ? `${m === 'PEN' ? 'S/' : '$'} ${n.toLocaleString('es-PE')}` : 'Consultar');

const matchColor = (m: number) => m >= 60 ? '#16A34A' : m >= 40 ? '#F59E0B' : '#64748B';

export default function RecomendacionesPage() {
  const [clientes, setClientes]   = useState<ClienteLite[]>([]);
  const [busqueda, setBusqueda]   = useState('');
  const [seleccionado, setSel]    = useState<number | null>(null);
  const [rec, setRec]             = useState<RecData | null>(null);
  const [loadingList, setLL]      = useState(true);
  const [loadingRec, setLR]       = useState(false);

  // Cargar lista de clientes desde el BACKEND (service role evita el bloqueo RLS
  // que sufre la clave anon del frontend). Asesor → solo sus clientes.
  const fetchClientes = useCallback(async () => {
    setLL(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams({ pageSize: '500' });
      if (session) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (prof?.role === 'asesor') params.set('asesorId', session.user.id);
      }
      const res  = await fetch(`${API}/api/clientes?${params}`);
      const json = await res.json();
      setClientes((json.data?.clientes ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as number, nombre: c.nombre as string, etapa: c.etapa as string, telefono: c.telefono as string,
      })));
    } catch { setClientes([]); }
    finally { setLL(false); }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const pedirRecomendaciones = async (clienteId: number) => {
    setSel(clienteId); setLR(true); setRec(null);
    try {
      const res  = await fetch(`${API}/api/recomendaciones?clienteId=${clienteId}`);
      const json = await res.json();
      if (json.success) setRec(json.data);
    } catch { /* noop */ }
    finally { setLR(false); }
  };

  const filtrados = clientes.filter(c => (c.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

      {/* Header */}
      <div>
        <h1 style={{ margin:0, fontSize:'1.35rem', fontWeight:800, color:'#0F172A', display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <FaMagic style={{ color:'#7C3AED' }} /> Recomendación Personalizada
        </h1>
        <p style={{ margin:'0.2rem 0 0', fontSize:'0.78rem', color:'#94A3B8' }}>
          Selecciona un cliente y el motor cruza su perfil con el inventario para sugerir las propiedades más relevantes
        </p>
      </div>

      <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap', alignItems:'flex-start' }}>

        {/* ── Panel izquierdo: selección de cliente ── */}
        <div style={{ flex:'1 1 280px', maxWidth:360, background:'#fff', borderRadius:14, boxShadow:'0 1px 4px rgba(0,0,0,.06)', overflow:'hidden' }}>
          <div style={{ padding:'1rem', borderBottom:'1px solid #F1F5F9' }}>
            <p style={{ margin:'0 0 0.6rem', fontSize:'0.82rem', fontWeight:700, color:'#0F172A' }}>1. Elige un cliente</p>
            <div style={{ position:'relative' }}>
              <FaSearch style={{ position:'absolute', left:'0.7rem', top:'50%', transform:'translateY(-50%)', color:'#94A3B8', fontSize:'0.8rem' }} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar cliente…"
                style={{ width:'100%', padding:'0.55rem 0.8rem 0.55rem 2rem', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:'0.85rem', outline:'none', boxSizing:'border-box' }} />
            </div>
          </div>
          <div style={{ maxHeight:480, overflowY:'auto' }}>
            {loadingList ? (
              <p style={{ padding:'1.5rem', textAlign:'center', color:'#94A3B8', fontSize:'0.85rem' }}>Cargando…</p>
            ) : filtrados.length === 0 ? (
              <p style={{ padding:'1.5rem', textAlign:'center', color:'#94A3B8', fontSize:'0.85rem' }}>Sin clientes</p>
            ) : filtrados.slice(0, 100).map(c => (
              <button key={c.id} onClick={() => pedirRecomendaciones(c.id)}
                style={{
                  width:'100%', textAlign:'left', padding:'0.7rem 1rem', border:'none', cursor:'pointer',
                  borderBottom:'1px solid #F8FAFC', display:'flex', alignItems:'center', gap:'0.6rem',
                  background: seleccionado===c.id ? '#F5F3FF' : '#fff',
                }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'#EDE9FE', color:'#7C3AED', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.8rem', flexShrink:0 }}>
                  {(c.nombre ?? '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, fontSize:'0.84rem', fontWeight:600, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre ?? `Lead #${c.id}`}</p>
                  <p style={{ margin:0, fontSize:'0.72rem', color:'#94A3B8', textTransform:'capitalize' }}>{c.etapa}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Panel derecho: recomendaciones ── */}
        <div style={{ flex:'2 1 460px', minWidth:0 }}>
          {!seleccionado ? (
            <div style={{ background:'#fff', borderRadius:14, padding:'3rem 2rem', textAlign:'center', color:'#94A3B8', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              <FaMagic size={36} style={{ color:'#C4B5FD', marginBottom:'0.75rem' }} />
              <p style={{ margin:0, fontSize:'0.9rem' }}>Selecciona un cliente para ver sus propiedades recomendadas</p>
            </div>
          ) : loadingRec ? (
            <div style={{ background:'#fff', borderRadius:14, padding:'3rem', textAlign:'center', color:'#64748B', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ width:28, height:28, border:'3px solid #E9D5FF', borderTopColor:'#7C3AED', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 0.75rem' }} />
              Buscando las mejores coincidencias…
              <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
            </div>
          ) : !rec ? (
            <div style={{ background:'#fff', borderRadius:14, padding:'2rem', textAlign:'center', color:'#94A3B8' }}>
              <FaExclamationTriangle style={{ color:'#F59E0B' }} /> No se pudo cargar
            </div>
          ) : (
            <>
              {/* Perfil del cliente */}
              <div style={{ background:'linear-gradient(135deg,#7C3AED10,#2563EB10)', border:'1px solid #E9D5FF', borderRadius:14, padding:'1.1rem 1.25rem', marginBottom:'1.25rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.6rem' }}>
                  <FaUser style={{ color:'#7C3AED' }} />
                  <span style={{ fontWeight:700, color:'#0F172A' }}>{rec.cliente.nombre}</span>
                  <span style={{ fontSize:'0.72rem', color:'#7C3AED', textTransform:'capitalize', background:'#EDE9FE', padding:'0.1rem 0.5rem', borderRadius:100 }}>{rec.cliente.etapa}</span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', fontSize:'0.76rem' }}>
                  {[
                    { l:'Busca', v: rec.cliente.tipo_preferido?.join(', ') ?? 'cualquier tipo' },
                    { l:'Zona', v: rec.cliente.distritos_preferidos?.join(', ') ?? 'cualquier zona' },
                    { l:'Presupuesto', v: rec.cliente.presupuesto_max ? `hasta ${fmtS(rec.cliente.presupuesto_max)}` : 'sin definir' },
                  ].map(x => (
                    <span key={x.l} style={{ background:'#fff', border:'1px solid #E9D5FF', borderRadius:8, padding:'0.3rem 0.6rem', color:'#475569' }}>
                      <strong style={{ color:'#6D28D9' }}>{x.l}:</strong> {x.v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Lista de propiedades recomendadas */}
              <p style={{ margin:'0 0 0.75rem', fontSize:'0.82rem', fontWeight:700, color:'#0F172A' }}>
                🎯 {rec.recomendaciones.length} propiedades recomendadas
                <span style={{ fontWeight:400, color:'#94A3B8' }}> (de {rec.total_inventario} disponibles)</span>
              </p>

              {rec.recomendaciones.length === 0 ? (
                <div style={{ background:'#fff', borderRadius:14, padding:'2rem', textAlign:'center', color:'#94A3B8' }}>
                  No hay propiedades que coincidan con este perfil.
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {rec.recomendaciones.map((r, i) => {
                    const p = r.propiedad;
                    return (
                      <div key={p.id} style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,.06)', overflow:'hidden', display:'flex', gap:'0.9rem', border: i===0?'1.5px solid #C4B5FD':'1px solid #F1F5F9' }}>
                        {/* Imagen */}
                        <div style={{ width:110, flexShrink:0, background:'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {p.imagen ? <img src={p.imagen} alt={p.direccion} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <FaHome style={{ color:'#CBD5E1', fontSize:'1.5rem' }} />}
                        </div>
                        {/* Datos */}
                        <div style={{ flex:1, padding:'0.85rem 0.9rem 0.85rem 0', minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'0.5rem' }}>
                            <div style={{ minWidth:0 }}>
                              <p style={{ margin:0, fontWeight:700, fontSize:'0.88rem', color:'#0F172A' }}>{p.direccion}</p>
                              <p style={{ margin:'0.15rem 0 0', fontSize:'0.74rem', color:'#64748B', display:'flex', gap:'0.7rem', flexWrap:'wrap' }}>
                                {p.distrito && <span><FaMapMarkerAlt size={9} /> {p.distrito}</span>}
                                {p.area_m2 && <span><FaRulerCombined size={9} /> {p.area_m2}m²</span>}
                                {p.dormitorios ? <span><FaBed size={9} /> {p.dormitorios}</span> : null}
                                {p.tipo && <span style={{ textTransform:'capitalize' }}>{p.tipo}</span>}
                              </p>
                            </div>
                            {/* Match score circular */}
                            <div style={{ textAlign:'center', flexShrink:0 }}>
                              <div style={{ fontSize:'1.3rem', fontWeight:800, color:matchColor(r.match), lineHeight:1 }}>{r.match}%</div>
                              <div style={{ fontSize:'0.6rem', color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.05em' }}>match</div>
                            </div>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'0.5rem', gap:'0.5rem', flexWrap:'wrap' }}>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.3rem' }}>
                              {r.razones.map((rz, j) => (
                                <span key={j} style={{ background:'#F0FDF4', color:'#15803D', border:'1px solid #BBF7D0', padding:'0.1rem 0.45rem', borderRadius:6, fontSize:'0.68rem' }}>✓ {rz}</span>
                              ))}
                            </div>
                            <span style={{ fontWeight:800, color:'#2563EB', fontSize:'0.95rem', whiteSpace:'nowrap' }}>{fmtS(p.precio, p.moneda)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
