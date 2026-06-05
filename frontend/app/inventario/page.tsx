'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FaPlus, FaSearch, FaPencilAlt, FaTrash, FaTimes, FaImage,
  FaToggleOn, FaToggleOff, FaRobot, FaSave, FaBuilding,
} from 'react-icons/fa';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

// ─── Types — alineados con tabla propiedades en Supabase ──────────────────────
interface Propiedad {
  id: string;                   // UUID
  direccion: string;
  distrito?: string;
  tipo: 'casa' | 'departamento' | 'terreno' | 'oficina' | 'local';
  area_m2?: number;
  dormitorios?: number;
  precio?: number;
  precio_venta?: number;
  moneda: 'PEN' | 'USD';
  estado: 'disponible' | 'reservado' | 'vendido' | 'alquilado';
  descripcion?: string;
  imagenes?: string[] | null;
  activo: boolean;
  created_at: string;
}

interface FormProp {
  direccion: string;
  distrito: string;
  tipo: Propiedad['tipo'];
  estado: Propiedad['estado'];
  precio: string;
  precio_venta: string;
  moneda: 'PEN' | 'USD';
  area_m2: string;
  dormitorios: string;
  descripcion: string;
  primera_imagen: string;  // URL de la primera foto — se envía como imagenes:[url]
}

const EMPTY_FORM: FormProp = {
  direccion: '',
  distrito: '',
  tipo: 'terreno',
  estado: 'disponible',
  precio: '',
  precio_venta: '',
  moneda: 'PEN',
  area_m2: '',
  dormitorios: '0',
  descripcion: '',
  primera_imagen: '',
};

const TIPOS:   Propiedad['tipo'][]   = ['casa','departamento','terreno','oficina','local'];
const ESTADOS: Propiedad['estado'][] = ['disponible','reservado','vendido','alquilado'];

const fmtPrecio = (p?: number, m = 'PEN') =>
  p ? `${m === 'PEN' ? 'S/' : '$'} ${p.toLocaleString('es-PE')}` : '—';

function estadoBadge(estado: Propiedad['estado']) {
  const map: Record<string, { bg: string; color: string }> = {
    disponible: { bg: '#DCFCE7', color: '#16A34A' },
    reservado:  { bg: '#FEF9C3', color: '#A16207' },
    vendido:    { bg: '#F1F5F9', color: '#475569' },
    alquilado:  { bg: '#EDE9FE', color: '#7C3AED' },
  };
  const s = map[estado] ?? { bg: '#F1F5F9', color: '#475569' };
  return (
    <span style={{ display:'inline-block', background:s.bg, color:s.color, padding:'0.2rem 0.65rem', borderRadius:100, fontSize:'0.75rem', fontWeight:700, textTransform:'capitalize' }}>
      {estado}
    </span>
  );
}

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function ModalPropiedad({ editing, onClose, onSaved }: {
  editing: Propiedad | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormProp>(
    editing ? {
      direccion:     editing.direccion ?? '',
      distrito:      editing.distrito  ?? '',
      tipo:          editing.tipo,
      estado:        editing.estado,
      precio:        String(editing.precio       ?? ''),
      precio_venta:  String(editing.precio_venta ?? ''),
      moneda:        editing.moneda ?? 'PEN',
      area_m2:       String(editing.area_m2    ?? ''),
      dormitorios:   String(editing.dormitorios ?? 0),
      descripcion:   editing.descripcion ?? '',
      primera_imagen: editing.imagenes?.[0] ?? '',
    } : { ...EMPTY_FORM }
  );

  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof FormProp) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  async function uploadImage(file: File) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG o WEBP.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5 MB.'); return; }
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (editing?.id) fd.append('propiedadId', editing.id);
      const res  = await fetch(`${API}/api/storage/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success && json.data?.url) {
        setForm(f => ({ ...f, primera_imagen: json.data.url }));
      } else {
        setError(json.error ?? 'Error al subir la imagen.');
      }
    } catch { setError('Error de conexión al subir la imagen.'); }
    finally   { setUploading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.direccion.trim()) { setError('La dirección es obligatoria.'); return; }
    if (form.precio && isNaN(Number(form.precio))) { setError('Precio inválido.'); return; }
    setSaving(true); setError('');

    const payload: Record<string, unknown> = {
      direccion:    form.direccion.trim(),
      distrito:     form.distrito.trim() || null,
      tipo:         form.tipo,
      estado:       form.estado,
      moneda:       form.moneda,
      descripcion:  form.descripcion.trim() || null,
      imagenes:     form.primera_imagen ? [form.primera_imagen] : null,
    };
    if (form.precio)       payload.precio       = Number(form.precio);
    if (form.precio_venta) payload.precio_venta = Number(form.precio_venta);
    if (form.area_m2)      payload.area_m2      = Number(form.area_m2);
    if (form.dormitorios)  payload.dormitorios  = Number(form.dormitorios);

    try {
      const url    = editing ? `${API}/api/propiedades/${editing.id}` : `${API}/api/propiedades`;
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la propiedad.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-head">
          <span className="modal-title">{editing ? '✏️ Editar Propiedad' : '➕ Nueva Propiedad'}</span>
          <button className="modal-close" onClick={onClose} type="button"><FaTimes /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert-error"><FaTimes style={{ flexShrink:0 }} /> {error}</div>}

            {/* Foto */}
            <div className="field">
              <label>Foto principal</label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files?.[0]; if(f) uploadImage(f); }}
                style={{ border:`2px dashed ${dragOver?'var(--sun)':'var(--gray-300)'}`, borderRadius:'var(--radius)', padding:'1rem', textAlign:'center', cursor:'pointer', background: dragOver?'var(--sun-light)':'var(--gray-50)', minHeight:100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}
              >
                {uploading ? <div className="spinner" /> :
                 form.primera_imagen ? (
                  <>
                    <img src={form.primera_imagen} alt="Preview" style={{ maxHeight:120, maxWidth:'100%', borderRadius:8, objectFit:'cover' }} />
                    <span style={{ fontSize:'0.75rem', color:'var(--gray-500)' }}>Clic o arrastra para cambiar</span>
                  </>
                ) : (
                  <>
                    <FaImage style={{ fontSize:'2rem', color:'var(--gray-400)' }} />
                    <span style={{ fontSize:'0.8rem', color:'var(--gray-500)' }}>Arrastra una imagen o <strong style={{ color:'var(--sun)' }}>haz clic</strong></span>
                    <span style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>JPG, PNG, WEBP · máx 5 MB</span>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadImage(f); }} />
            </div>

            {/* Dirección + Distrito */}
            <div className="row-2">
              <div className="field">
                <label>Dirección *</label>
                <input className="fi" value={form.direccion} onChange={set('direccion')} placeholder="Av. Larco 123, Trujillo" required />
              </div>
              <div className="field">
                <label>Distrito</label>
                <input className="fi" value={form.distrito} onChange={set('distrito')} placeholder="Ej. La Esperanza" />
              </div>
            </div>

            {/* Tipo + Estado */}
            <div className="row-2">
              <div className="field">
                <label>Tipo *</label>
                <select className="fi" value={form.tipo} onChange={set('tipo')}>
                  {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Estado *</label>
                <select className="fi" value={form.estado} onChange={set('estado')}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Precio + Precio venta + Moneda */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 120px', gap:'1rem' }}>
              <div className="field">
                <label>Precio lista</label>
                <input className="fi" type="number" min="0" step="0.01" value={form.precio} onChange={set('precio')} placeholder="0.00" />
              </div>
              <div className="field">
                <label>Precio venta</label>
                <input className="fi" type="number" min="0" step="0.01" value={form.precio_venta} onChange={set('precio_venta')} placeholder="0.00" />
              </div>
              <div className="field">
                <label>Moneda</label>
                <select className="fi" value={form.moneda} onChange={set('moneda')}>
                  <option value="PEN">PEN (S/)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Área + Dormitorios */}
            <div className="row-2">
              <div className="field">
                <label>Área (m²)</label>
                <input className="fi" type="number" min="0" value={form.area_m2} onChange={set('area_m2')} placeholder="0" />
              </div>
              <div className="field">
                <label>Dormitorios</label>
                <input className="fi" type="number" min="0" value={form.dormitorios} onChange={set('dormitorios')} placeholder="0" />
              </div>
            </div>

            {/* Descripción */}
            <div className="field">
              <label>Descripción</label>
              <textarea className="fi" value={form.descripcion} onChange={set('descripcion')} placeholder="Descripción detallada de la propiedad…" rows={3} style={{ resize:'vertical' }} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-sec" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-pri" disabled={saving || uploading}>
              {saving ? <span className="spinner" style={{ width:16, height:16, borderWidth:2, display:'inline-block' }} /> : null}
              {saving ? ' Guardando…' : '💾 Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-head">
          <span className="modal-title">Confirmar acción</span>
          <button className="modal-close" onClick={onCancel}><FaTimes /></button>
        </div>
        <div className="modal-body" style={{ fontSize:'0.9rem', color:'var(--earth)' }}>{msg}</div>
        <div className="modal-footer">
          <button className="btn-sec" onClick={onCancel}>Cancelar</button>
          <button className="btn-pri" onClick={onConfirm} style={{ background:'#DC2626' }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InventarioPage() {
  const [propiedades,   setPropiedades]   = useState<Propiedad[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filtroEstado,  setFiltroEstado]  = useState('todos');
  const [filtroTipo,    setFiltroTipo]    = useState('todos');
  const [showModal,     setShowModal]     = useState(false);
  const [editing,       setEditing]       = useState<Propiedad | null>(null);
  const [confirmId,     setConfirmId]     = useState<string | null>(null);
  const [deleting,      setDeleting]      = useState(false);
  const [reglas,        setReglas]        = useState('');
  const [reglasSaving,  setReglasSaving]  = useState(false);
  const [reglasSaved,   setReglasSaved]   = useState(false);
  const [reglasLoading, setReglasLoading] = useState(true);

  const fetchPropiedades = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/propiedades?todas=true&pageSize=500`);
      const json = await res.json();
      setPropiedades(json.data?.propiedades ?? []);
    } catch { setPropiedades([]); }
    finally  { setLoading(false); }
  }, []);

  const fetchReglas = useCallback(async () => {
    setReglasLoading(true);
    try {
      const res  = await fetch(`${API}/api/ia-reglas`);
      const json = await res.json();
      setReglas(json.data?.reglas ?? '');
    } catch { setReglas(''); }
    finally  { setReglasLoading(false); }
  }, []);

  useEffect(() => { fetchPropiedades(); fetchReglas(); }, [fetchPropiedades, fetchReglas]);

  // El agente puede llegar con ?distrito= y/o ?estado= para filtrar al instante
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const distrito = sp.get('distrito');
    const estado   = sp.get('estado');
    if (distrito) setSearch(distrito);
    if (estado && ['disponible','reservado','vendido','alquilado'].includes(estado)) setFiltroEstado(estado);
  }, []);

  async function toggleActivo(p: Propiedad) {
    try {
      await fetch(`${API}/api/propiedades/${p.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !p.activo }),
      });
      setPropiedades(prev => prev.map(x => x.id === p.id ? { ...x, activo: !x.activo } : x));
    } catch { /* re-sincroniza en próximo fetch */ }
  }

  async function handleDelete() {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await fetch(`${API}/api/propiedades/${confirmId}`, { method: 'DELETE' });
      setConfirmId(null);
      fetchPropiedades();
    } finally { setDeleting(false); }
  }

  async function saveReglas() {
    setReglasSaving(true); setReglasSaved(false);
    try {
      await fetch(`${API}/api/ia-reglas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reglas }),
      });
      setReglasSaved(true);
      setTimeout(() => setReglasSaved(false), 3000);
    } finally { setReglasSaving(false); }
  }

  const filtradas = propiedades.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.direccion?.toLowerCase().includes(q)
      || p.distrito?.toLowerCase().includes(q)
      || p.descripcion?.toLowerCase().includes(q);
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const matchTipo   = filtroTipo   === 'todos' || p.tipo   === filtroTipo;
    return matchSearch && matchEstado && matchTipo;
  });

  const total      = propiedades.length;
  const activas    = propiedades.filter(p => p.activo).length;
  const disponibles= propiedades.filter(p => p.estado === 'disponible').length;
  const vendidas   = propiedades.filter(p => p.estado === 'vendido').length;

  return (
    <div style={{ padding:'2rem', maxWidth:1300, margin:'0 auto' }}>

      {/* Header */}
      <div className="ph">
        <div>
          <h1 className="pt">📦 Inventario de Propiedades</h1>
          <p className="ps">Gestiona todas las propiedades y configura la inteligencia artificial</p>
        </div>
        <button className="btn-pri" onClick={() => { setEditing(null); setShowModal(true); }} style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <FaPlus /> Nueva Propiedad
        </button>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="sc"><div className="sl">Total</div><div className="sv">{total}</div><div className="ss">propiedades registradas</div></div>
        <div className="sc"><div className="sl">En Portal</div><div className="sv">{activas}</div><div className="ss">publicadas actualmente</div></div>
        <div className="sc"><div className="sl">Disponibles</div><div className="sv" style={{ color:'#16A34A' }}>{disponibles}</div><div className="ss">listas para venta</div></div>
        <div className="sc"><div className="sl">Vendidas</div><div className="sv" style={{ color:'#64748B' }}>{vendidas}</div><div className="ss">cerradas</div></div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'1.25rem', alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 220px' }}>
          <FaSearch style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)', pointerEvents:'none', fontSize:'0.8rem' }} />
          <input className="fi" placeholder="Buscar por dirección, distrito…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:'2.25rem' }} />
        </div>
        <select className="fi" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ maxWidth:170 }}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>)}
        </select>
        <select className="fi" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ maxWidth:170 }}>
          <option value="todos">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="tabla" style={{ marginBottom:'2rem' }}>
        <div className="tabla-head">
          <span className="tabla-title">{filtradas.length} propiedad{filtradas.length!==1?'es':''}</span>
        </div>
        <div className="tw">
          {loading ? (
            <div className="te"><div className="spinner" style={{ margin:'0 auto' }} /></div>
          ) : filtradas.length === 0 ? (
            <div className="te">
              <span className="te-icon">🏠</span>
              <p style={{ color:'var(--gray-500)', fontSize:'0.9rem' }}>
                {search || filtroEstado !== 'todos' || filtroTipo !== 'todos'
                  ? 'No hay propiedades que coincidan con los filtros.'
                  : 'Aún no hay propiedades. ¡Agrega la primera!'}
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Dirección / Distrito</th>
                  <th>Tipo</th>
                  <th>Área</th>
                  <th>Precio venta</th>
                  <th>Estado</th>
                  <th style={{ textAlign:'center' }}>Portal</th>
                  <th style={{ textAlign:'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(p => {
                  const imgUrl = p.imagenes?.[0];
                  return (
                    <tr key={p.id}>
                      <td style={{ width:64 }}>
                        {imgUrl ? (
                          <img src={imgUrl} alt={p.direccion} style={{ width:52, height:40, objectFit:'cover', borderRadius:6, border:'1px solid var(--gray-200)' }} />
                        ) : (
                          <div style={{ width:52, height:40, borderRadius:6, background:'var(--gray-100)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--gray-400)' }}>
                            <FaBuilding style={{ fontSize:'1.1rem' }} />
                          </div>
                        )}
                      </td>
                      <td style={{ minWidth:200 }}>
                        <div style={{ fontWeight:600, fontSize:'0.87rem', color:'var(--earth)', lineHeight:1.3 }}>{p.direccion}</div>
                        {p.distrito && <div style={{ fontSize:'0.76rem', color:'var(--gray-400)', marginTop:2 }}>{p.distrito}</div>}
                      </td>
                      <td style={{ textTransform:'capitalize', color:'var(--gray-700)' }}>{p.tipo}</td>
                      <td>{p.area_m2 ? `${p.area_m2} m²` : '—'}</td>
                      <td style={{ fontWeight:700, color:'var(--sun)', whiteSpace:'nowrap' }}>
                        {fmtPrecio(p.precio_venta ?? p.precio, p.moneda)}
                      </td>
                      <td>{estadoBadge(p.estado)}</td>
                      <td style={{ textAlign:'center' }}>
                        <button onClick={() => toggleActivo(p)} title={p.activo?'Visible en portal':'Oculto'} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.6rem', lineHeight:1, color: p.activo?'var(--sun)':'var(--gray-300)', transition:'color 0.2s' }}>
                          {p.activo ? <FaToggleOn /> : <FaToggleOff />}
                        </button>
                      </td>
                      <td style={{ textAlign:'center', whiteSpace:'nowrap' }}>
                        <button onClick={() => { setEditing(p); setShowModal(true); }} style={{ background:'var(--sun-light)', color:'var(--sun)', border:'none', borderRadius:6, padding:'0.35rem 0.6rem', cursor:'pointer', marginRight:'0.4rem', fontSize:'0.82rem' }} title="Editar">
                          <FaPencilAlt />
                        </button>
                        <button onClick={() => setConfirmId(p.id)} style={{ background:'#FEF2F2', color:'#DC2626', border:'none', borderRadius:6, padding:'0.35rem 0.6rem', cursor:'pointer', fontSize:'0.82rem' }} title="Eliminar">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* IA Reglas Panel */}
      <div className="tabla" style={{ overflow:'visible' }}>
        <div className="tabla-head">
          <span className="tabla-title" style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <FaRobot style={{ color:'var(--sun)' }} /> Panel de Campañas IA
          </span>
        </div>
        <div style={{ padding:'1.5rem' }}>
          <p style={{ fontSize:'0.85rem', color:'var(--gray-500)', marginBottom:'1rem', lineHeight:1.6 }}>
            Define las instrucciones que guiarán al asistente de IA en las conversaciones con clientes. Indica el tono, inmuebles destacados y promociones vigentes.
          </p>
          {reglasLoading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'1.5rem' }}><div className="spinner" /></div>
          ) : (
            <>
              <div className="field" style={{ marginBottom:'1rem' }}>
                <label>Instrucciones para el Asistente IA</label>
                <textarea className="fi" value={reglas} onChange={e => setReglas(e.target.value)}
                  placeholder={'Ej. Eres un asistente amigable de la inmobiliaria Luz del Sol.\nResponde siempre en español. Destaca las propiedades en Miraflores.\nPromoción activa: 5% de descuento en departamentos hasta fin de mes...'}
                  rows={8} style={{ resize:'vertical', fontFamily:'monospace', fontSize:'0.85rem' }}
                />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <button className="btn-pri" onClick={saveReglas} disabled={reglasSaving} style={{ display:'flex', alignItems:'center', gap:'0.45rem' }}>
                  {reglasSaving ? <span className="spinner" style={{ width:14, height:14, borderWidth:2 }} /> : <FaSave />}
                  {reglasSaving ? 'Actualizando…' : 'Actualizar Inteligencia Artificial'}
                </button>
                {reglasSaved && <span style={{ fontSize:'0.82rem', color:'#16A34A', display:'flex', alignItems:'center', gap:'0.3rem' }}>✅ Instrucciones guardadas correctamente</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <ModalPropiedad
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { setShowModal(false); setEditing(null); fetchPropiedades(); }}
        />
      )}

      {confirmId !== null && (
        <ConfirmDialog
          msg="¿Eliminar esta propiedad? Se desactivará del sistema."
          onCancel={() => setConfirmId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
