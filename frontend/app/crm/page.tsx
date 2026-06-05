'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    FaFire, FaSearch, FaTimes, FaClipboardList, FaRobot,
    FaEdit, FaHistory, FaStickyNote, FaPaperPlane, FaPhone,
    FaThumbtack, FaBed, FaMoon, FaGlobe, FaHandshake,
} from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

interface Cliente {
    id: number;
    nombre?: string;
    telefono?: string;
    email?: string;
    etapa: string;
    origen?: string;
    puntuacion_lead?: number;
    ultima_actividad?: string;
    created_at: string;
    updated_at: string;
    preferencias_extra?: Record<string, unknown>;
    presupuesto_min?: number;
    presupuesto_max?: number;
    tipo_preferido?: string[];
    distritos_preferidos?: string[];
}

interface Seguimiento {
    id: number;
    tipo: string;
    notas?: string;
    ejecutado_en?: string;
    created_at: string;
    estado: string;
}

interface ClienteDetalle {
    cliente: Cliente;
    seguimientos: Seguimiento[];
    mensajes: unknown[];
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

const ETAPAS = ['nuevo', 'contactado', 'negociacion', 'cierre', 'perdido'];

const ETAPA_META: Record<string, { label: string; color: string; bg: string }> = {
    nuevo: { label: 'Nuevo', color: '#1D4ED8', bg: '#EFF6FF' },
    contactado: { label: 'Contactado', color: '#7C3AED', bg: '#F5F3FF' },
    negociacion: { label: 'Negociación', color: '#D97706', bg: '#FFFBEB' },
    cierre: { label: 'Cierre', color: '#059669', bg: '#ECFDF5' },
    perdido: { label: 'Perdido', color: '#DC2626', bg: '#FEF2F2' },
};

const ORIGEN_META: Record<string, { label: string; icon: React.ReactNode }> = {
    web: { label: 'Web', icon: <FaGlobe size={10} /> },
    telegram: { label: 'Telegram', icon: <FaPaperPlane size={10} /> },
    referido: { label: 'Referido', icon: <FaHandshake size={10} /> },
};

const formatFecha = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatFechaHora = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-PE', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
    });
};

function BadgeEtapa({ etapa }: { etapa: string }) {
    const meta = ETAPA_META[etapa] ?? { label: etapa, color: '#6B7280', bg: '#F3F4F6' };
    return (
        <span
            className={`badge-etapa badge-etapa-${etapa}`}
            style={{ color: meta.color, background: meta.bg }}
        >
            {meta.label}
        </span>
    );
}

function SelectorEtapa({ clienteId, etapaActual, onCambio }: {
    clienteId: number;
    etapaActual: string;
    onCambio: (id: number, etapa: string) => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nuevaEtapa = e.target.value;
        setLoading(true);
        try {
            await fetch(`${BACKEND}/api/clientes/${clienteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ etapa: nuevaEtapa }),
            });
            onCambio(clienteId, nuevaEtapa);
        } finally {
            setLoading(false);
        }
    };

    const meta = ETAPA_META[etapaActual] ?? { color: '#6B7280', bg: '#F3F4F6' };

    return (
        <select
            className={`selector-etapa selector-etapa-${etapaActual}`}
            value={etapaActual}
            onChange={handleChange}
            disabled={loading}
            style={{ cursor: loading ? 'wait' : 'pointer' }}
            onClick={e => e.stopPropagation()}
        >
            {ETAPAS.map(e => (
                <option key={e} value={e}>{ETAPA_META[e]?.label ?? e}</option>
            ))}
        </select>
    );
}

function HotLeadCard({ cliente, onClick }: { cliente: Cliente; onClick: () => void }) {
    return (
        <div className="hot-card" onClick={onClick}>
            <div className="hot-card-header">
                <div className="hot-avatar">
                    {cliente.nombre?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div>
                    <p className="hot-nombre">{cliente.nombre ?? 'Sin nombre'}</p>
                    <p className="hot-tel" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><FaPhone size={10} /> {cliente.telefono ?? '—'}</p>
                </div>
                <div className="hot-score" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FaFire size={11} /> {cliente.puntuacion_lead ?? '—'}
                </div>
            </div>
            <div className="hot-meta">
                <BadgeEtapa etapa={cliente.etapa} />
                {cliente.origen && (
                    <span className="hot-origen" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {(() => {
                            const meta = ORIGEN_META[cliente.origen];
                            if (!meta) return cliente.origen;
                            return <>{meta.icon} {meta.label}</>;
                        })()}
                    </span>
                )}
            </div>
            {cliente.preferencias_extra && (
                <p className="hot-resumen">
                    {typeof cliente.preferencias_extra?.resumen_ia === 'string'
                        ? cliente.preferencias_extra.resumen_ia
                        : `Presupuesto: S/ ${cliente.presupuesto_min?.toLocaleString() ?? '?'} - ${cliente.presupuesto_max?.toLocaleString() ?? '?'}`
                    }
                </p>
            )}
        </div>
    );
}

function ClienteDrawer({
    clienteId,
    onClose,
    onEtapaCambio,
}: {
    clienteId: number;
    onClose: () => void;
    onEtapaCambio: (id: number, etapa: string) => void;
}) {
    const [detalle, setDetalle] = useState<ClienteDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [nota, setNota] = useState('');
    const [guardando, setGuardando] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const fetchDetalle = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${BACKEND}/api/clientes/${clienteId}`);
                const json = await res.json();
                if (json.success) setDetalle(json.data);
            } finally {
                setLoading(false);
            }
        };
        fetchDetalle();
    }, [clienteId]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const guardarNota = async () => {
        if (!nota.trim() || !detalle) return;
        setGuardando(true);
        try {
            const res = await fetch(`${BACKEND}/api/clientes/${clienteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nota_asesor: nota.trim() }),
            });
            const json = await res.json();
            if (json.success) {

                const nuevaSeguimiento: Seguimiento = {
                    id: Date.now(),
                    tipo: 'nota',
                    notas: nota.trim(),
                    ejecutado_en: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    estado: 'realizado',
                };
                setDetalle(d => d ? {
                    ...d,
                    seguimientos: [nuevaSeguimiento, ...d.seguimientos],
                } : d);
                setNota('');
                if (textareaRef.current) textareaRef.current.focus();
            }
        } finally {
            setGuardando(false);
        }
    };

    const cliente = detalle?.cliente;

    return (
        <>
            <div className="drawer-overlay" onClick={onClose} />

            <aside className="drawer">
                <div className="drawer-header">
                    <div>
                        <h2 className="drawer-title">{cliente?.nombre ?? 'Cargando...'}</h2>
                        {cliente && <BadgeEtapa etapa={cliente.etapa} />}
                    </div>
                    <button className="drawer-close" onClick={onClose}><FaTimes /></button>
                </div>

                {loading ? (
                    <div className="drawer-loading">
                        <div className="spinner" />
                    </div>
                ) : !detalle ? (
                    <div className="drawer-loading">Error al cargar</div>
                ) : (
                    <div className="drawer-body">

                        <section className="drawer-section">
                            <h3 className="drawer-section-title"><FaClipboardList style={{ marginRight: '0.35rem' }} /> Datos del Cliente</h3>
                            <div className="data-grid">
                                <div className="data-item">
                                    <span className="data-label">Teléfono</span>
                                    <span className="data-value">
                                        <a href={`tel:${cliente?.telefono}`} style={{ color: 'var(--sun-dark)' }}>
                                            {cliente?.telefono ?? '—'}
                                        </a>
                                    </span>
                                </div>
                                {cliente?.email && (
                                    <div className="data-item">
                                        <span className="data-label">Email</span>
                                        <span className="data-value">{cliente.email}</span>
                                    </div>
                                )}
                                <div className="data-item">
                                    <span className="data-label">Origen</span>
                                    <span className="data-value">
                                        {(() => {
                                            const origenKey = cliente?.origen ?? '';
                                            const meta = ORIGEN_META[origenKey];
                                            return meta
                                                ? `${meta.icon} ${meta.label}`
                                                : (cliente?.origen ?? '—');
                                        })()}
                                    </span>
                                </div>
                                <div className="data-item">
                                    <span className="data-label">Registrado</span>
                                    <span className="data-value">{formatFecha(cliente?.created_at)}</span>
                                </div>
                                {(cliente?.presupuesto_min || cliente?.presupuesto_max) && (
                                    <div className="data-item">
                                        <span className="data-label">Presupuesto</span>
                                        <span className="data-value">
                                            S/ {cliente?.presupuesto_min?.toLocaleString() ?? '?'} — {cliente?.presupuesto_max?.toLocaleString() ?? '?'}
                                        </span>
                                    </div>
                                )}
                                {cliente?.distritos_preferidos && cliente.distritos_preferidos.length > 0 && (
                                    <div className="data-item">
                                        <span className="data-label">Zonas de interés</span>
                                        <span className="data-value">{cliente.distritos_preferidos.join(', ')}</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '0.75rem' }}>
                                <span className="data-label">Cambiar etapa</span>
                                <div style={{ marginTop: '0.3rem' }}>
                                    <SelectorEtapa
                                        clienteId={cliente!.id}
                                        etapaActual={cliente!.etapa}
                                        onCambio={(id, etapa) => {
                                            onEtapaCambio(id, etapa);
                                            setDetalle(d => d ? { ...d, cliente: { ...d.cliente, etapa } } : d);
                                        }}
                                    />
                                </div>
                            </div>
                        </section>

                        {typeof cliente?.preferencias_extra?.resumen_ia === 'string' && (
                            <section className="drawer-section">
                                <h3 className="drawer-section-title"><FaRobot style={{ marginRight: '0.35rem' }} /> Resumen de IA</h3>
                                <div className="ia-box">
                                    <p>{String(cliente.preferencias_extra.resumen_ia)}</p>
                                </div>
                            </section>
                        )}

                        <section className="drawer-section">
                            <h3 className="drawer-section-title"><FaEdit style={{ marginRight: '0.35rem' }} /> Agregar Nota</h3>
                            <textarea
                                ref={textareaRef}
                                className="nota-textarea"
                                placeholder="Ej: Cliente interesado en lote de 120m², consultará con familiar antes de decidir..."
                                value={nota}
                                onChange={e => setNota(e.target.value)}
                                rows={3}
                            />
                            <button
                                className="btn-guardar-nota"
                                onClick={guardarNota}
                                disabled={guardando || !nota.trim()}
                            >
                                {guardando ? 'Guardando...' : 'Guardar Nota'}
                            </button>
                        </section>

                        <section className="drawer-section">
                            <h3 className="drawer-section-title">
                                <FaHistory style={{ marginRight: '0.35rem' }} /> Historial
                                {detalle.seguimientos.length > 0 && (
                                    <span className="timeline-count">{detalle.seguimientos.length}</span>
                                )}
                            </h3>

                            {detalle.seguimientos.length === 0 ? (
                                <p className="timeline-empty">Sin actividad registrada aún.</p>
                            ) : (
                                <div className="timeline">
                                    {detalle.seguimientos.map((seg, i) => (
                                        <div key={seg.id} className="timeline-item">
                                            <div className="timeline-dot" />
                                            {i < detalle.seguimientos.length - 1 && <div className="timeline-line" />}
                                            <div className="timeline-content">
                                                <div className="timeline-meta">
                                                    <span className="timeline-tipo" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        {seg.tipo === 'nota' ? <FaStickyNote size={11} /> :
                                                            seg.tipo === 'telegram' ? <FaPaperPlane size={11} /> :
                                                                seg.tipo === 'llamada' ? <FaPhone size={11} /> : <FaThumbtack size={11} />} {seg.tipo}
                                                    </span>
                                                    <span className="timeline-fecha">
                                                        {formatFechaHora(seg.ejecutado_en ?? seg.created_at)}
                                                    </span>
                                                </div>
                                                {seg.notas && (
                                                    <p className="timeline-nota">{seg.notas}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </aside>
        </>
    );
}

export default function CRMPage() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [hotLeads, setHotLeads] = useState<Cliente[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);

    const [busqueda, setBusqueda] = useState('');
    const [filtroEtapa, setFiltroEtapa] = useState('');
    const [filtroOrigen, setFiltroOrigen] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 8;

    const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());

    // Filtro por asesor: cada asesor ve solo sus leads. '' hasta resolver la sesión.
    const [asesorId, setAsesorId] = useState<string | null>(null);
    const [sesionLista, setSesionLista] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                if (prof?.role === 'asesor') setAsesorId(session.user.id);
            }
            setSesionLista(true);
        });
    }, []);

    const fetchClientes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(PAGE_SIZE),
            });
            if (busqueda) params.set('q', busqueda);
            if (filtroEtapa) params.set('etapa', filtroEtapa);
            if (filtroOrigen) params.set('origen', filtroOrigen);
            if (asesorId) params.set('asesorId', asesorId);

            const res = await fetch(`${BACKEND}/api/clientes?${params}`);
            const json = await res.json();

            if (json.success) {
                setClientes(json.data?.clientes ?? []);
                setTotal(json.data?.total ?? 0);
            }
        } finally {
            setLoading(false);
        }
    }, [busqueda, filtroEtapa, filtroOrigen, page, asesorId]);

    const fetchHotLeads = useCallback(async () => {
        const params = new URLSearchParams({ hot: 'true', pageSize: '10' });
        if (asesorId) params.set('asesorId', asesorId);
        const res = await fetch(`${BACKEND}/api/clientes?${params}`);
        const json = await res.json();
        if (json.success) setHotLeads(json.data?.clientes ?? []);
    }, [asesorId]);

    // Esperar a resolver la sesión antes de cargar (para aplicar el filtro de asesor)
    useEffect(() => { if (sesionLista) fetchClientes(); }, [sesionLista, fetchClientes]);
    useEffect(() => { if (sesionLista) fetchHotLeads(); }, [sesionLista, fetchHotLeads]);

    // El agente puede llegar con ?q= para buscar al instante
    useEffect(() => {
        const q = new URLSearchParams(window.location.search).get('q');
        if (q) setBusqueda(q);
    }, []);

    useEffect(() => { setPage(1); }, [busqueda, filtroEtapa, filtroOrigen]);

    const handleEtapaCambio = (id: number, etapa: string) => {
        setClientes(cs => cs.map(c => c.id === id ? { ...c, etapa } : c));
        setHotLeads(cs => cs.map(c => c.id === id ? { ...c, etapa } : c));
    };

    const toggleSeleccion = (id: number) => {
        setSeleccionados(s => {
            const nuevo = new Set(s);
            if (nuevo.has(id)) nuevo.delete(id);
            else nuevo.add(id);
            return nuevo;
        });
    };

    const toggleTodos = () => {
        if (seleccionados.size === clientes.length) {
            setSeleccionados(new Set());
        } else {
            setSeleccionados(new Set(clientes.map(c => c.id)));
        }
    };

    const totalPaginas = Math.ceil(total / PAGE_SIZE);

    return (
        <>
            <style>{`
              /* ── Page header ── */
              .page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;}
              .page-title{font-family:var(--font-display,'Poppins',sans-serif);font-size:1.5rem;font-weight:700;color:var(--earth,#0F172A);margin:0;}
              .page-subtitle{font-size:0.85rem;color:var(--gray-500,#64748B);margin:0.2rem 0 0;}

              /* ── Hot leads ── */
              .hot-section{margin-bottom:2rem;}
              .section-label{display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gray-500,#64748B);margin-bottom:.75rem;}
              .hot-badge{background:#FEF2F2;color:#DC2626;font-size:.7rem;font-weight:700;padding:.1rem .45rem;border-radius:999px;}
              .hot-empty{display:flex;align-items:center;gap:.5rem;padding:.85rem 1rem;background:var(--gray-50,#FAFAFA);border:1px solid var(--gray-200,#E2E8F0);border-radius:var(--radius-sm,8px);font-size:.84rem;color:var(--gray-400,#94A3B8);}
              .hot-scroll{display:flex;gap:1rem;overflow-x:auto;overflow-y:hidden;padding-bottom:.6rem;width:100%;max-width:100%;min-width:0;scroll-snap-type:x proximity;}
              .hot-scroll>*{scroll-snap-align:start;}
              .hot-scroll::-webkit-scrollbar{height:8px;}
              .hot-scroll::-webkit-scrollbar-track{background:#F1F5F9;border-radius:10px;}
              .hot-scroll::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:10px;}
              .hot-scroll::-webkit-scrollbar-thumb:hover{background:#94A3B8;}
              .hot-card{background:var(--white,#fff);border:1px solid var(--gray-200,#E2E8F0);border-radius:var(--radius,12px);padding:1rem;min-width:220px;max-width:260px;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s;flex-shrink:0;}
              .hot-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(15,23,42,.1);border-color:var(--sun,#2563EB);}
              .hot-card-header{display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;}
              .hot-avatar{width:36px;height:36px;border-radius:50%;background:var(--sun,#2563EB);color:white;display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:700;flex-shrink:0;}
              .hot-nombre{font-size:.88rem;font-weight:600;color:var(--earth,#0F172A);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;}
              .hot-tel{font-size:.76rem;color:var(--gray-400,#94A3B8);margin:.1rem 0 0;}
              .hot-score{margin-left:auto;font-size:.82rem;font-weight:700;color:#DC2626;white-space:nowrap;}
              .hot-meta{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-top:.35rem;}
              .hot-origen{font-size:.7rem;background:var(--sun-light,#EFF6FF);color:var(--sun,#2563EB);padding:.12rem .45rem;border-radius:999px;font-weight:600;}
              .hot-resumen{font-size:.75rem;color:var(--gray-500,#64748B);margin-top:.4rem;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}

              /* ── Tabla CRM ── */
              .tabla-section{background:var(--white,#fff);border:1px solid var(--gray-200,#E2E8F0);border-radius:var(--radius,12px);box-shadow:0 1px 3px rgba(15,23,42,.06);overflow:hidden;}
              .tabla-toolbar{display:flex;align-items:center;gap:.75rem;padding:1rem 1.25rem;border-bottom:1px solid var(--gray-200,#E2E8F0);flex-wrap:wrap;}
              .search-wrap{position:relative;flex:1;min-width:180px;}
              .search-icon{position:absolute;left:.65rem;top:50%;transform:translateY(-50%);font-size:.9rem;pointer-events:none;}
              .search-input{width:100%;padding:.5rem .85rem .5rem 2rem;border:1.5px solid var(--gray-300,#CBD5E1);border-radius:var(--radius-sm,8px);font-size:.85rem;font-family:inherit;color:var(--earth,#0F172A);background:var(--gray-50,#FAFAFA);outline:none;transition:border-color .2s;}
              .search-input:focus{border-color:var(--sun,#2563EB);background:var(--white,#fff);}
              .filter-select{padding:.5rem .75rem;border:1.5px solid var(--gray-300,#CBD5E1);border-radius:var(--radius-sm,8px);font-size:.82rem;font-family:inherit;color:var(--earth,#0F172A);background:var(--gray-50,#FAFAFA);outline:none;cursor:pointer;}
              .seleccion-bar{display:flex;align-items:center;gap:.75rem;padding:.6rem 1.25rem;background:var(--sun-light,#EFF6FF);border-bottom:1px solid var(--gray-200,#E2E8F0);font-size:.85rem;font-weight:600;color:var(--sun,#2563EB);}
              .btn-accion-masiva{background:white;border:1px solid var(--gray-300,#CBD5E1);color:var(--earth,#0F172A);padding:.3rem .75rem;border-radius:var(--radius-sm,8px);font-size:.8rem;cursor:pointer;transition:background .2s;}
              .btn-accion-masiva:hover{background:var(--gray-100,#F1F5F9);}
              .tabla-wrap{overflow-x:auto;}
              .tabla-wrap .badge{position:static;display:inline-block;}
              .checkbox{width:15px;height:15px;cursor:pointer;accent-color:var(--sun,#2563EB);}
              .cliente-nombre{font-weight:600;color:var(--earth,#0F172A);font-size:.88rem;}
              .cliente-tel{font-size:.82rem;color:var(--gray-500,#64748B);}
              .tabla-estado{padding:2.5rem;text-align:center;}
              .tabla-estado-icon{font-size:2rem;margin-bottom:.5rem;}

              /* ── Paginación ── */
              .paginacion{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1.25rem;border-top:1px solid var(--gray-200,#E2E8F0);flex-wrap:wrap;gap:.5rem;}
              .paginacion-info{font-size:.8rem;color:var(--gray-400,#94A3B8);}
              .paginacion-btns{display:flex;gap:.3rem;}
              .pag-btn{background:var(--white,#fff);border:1px solid var(--gray-300,#CBD5E1);color:var(--earth,#0F172A);padding:.35rem .65rem;border-radius:var(--radius-sm,8px);font-size:.8rem;cursor:pointer;transition:all .2s;font-family:inherit;}
              .pag-btn:hover:not(:disabled){background:var(--sun-light,#EFF6FF);border-color:var(--sun,#2563EB);color:var(--sun,#2563EB);}
              .pag-btn.active{background:var(--sun,#2563EB);border-color:var(--sun,#2563EB);color:white;font-weight:700;}
              .pag-btn:disabled{opacity:.4;cursor:not-allowed;}

              /* ── Drawer lateral ── */
              .drawer-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(3px);z-index:150;}
              .drawer{position:fixed;top:0;right:0;bottom:0;width:420px;max-width:calc(100vw - 2rem);background:var(--white,#fff);box-shadow:-8px 0 40px rgba(15,23,42,.14);z-index:151;display:flex;flex-direction:column;animation:drawerIn .22s ease;overflow:hidden;}
              @keyframes drawerIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
              .drawer-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid var(--gray-200,#E2E8F0);flex-shrink:0;}
              .drawer-title{font-family:var(--font-display,'Poppins',sans-serif);font-size:1.1rem;font-weight:600;color:var(--earth,#0F172A);margin:0 0 .3rem;}
              .drawer-close{background:var(--gray-100,#F1F5F9);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.82rem;color:var(--gray-500,#64748B);transition:background .2s;}
              .drawer-close:hover{background:var(--gray-300,#CBD5E1);}
              .drawer-loading{flex:1;display:flex;align-items:center;justify-content:center;min-height:200px;color:var(--gray-400,#94A3B8);font-size:.9rem;gap:.75rem;}
              .drawer-body{flex:1;overflow-y:auto;padding:1rem 1.5rem 2rem;display:flex;flex-direction:column;gap:1.25rem;}
              .drawer-section{display:flex;flex-direction:column;gap:.6rem;}
              .drawer-section-title{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gray-400,#94A3B8);margin:0;}
              .data-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;}
              .data-item{display:flex;flex-direction:column;gap:.1rem;}
              .data-label{font-size:.7rem;font-weight:600;color:var(--gray-400,#94A3B8);text-transform:uppercase;letter-spacing:.06em;}
              .data-value{font-size:.85rem;color:var(--earth,#0F172A);font-weight:500;}
              .ia-box{background:var(--sun-light,#EFF6FF);border-left:3px solid var(--sun,#2563EB);border-radius:0 var(--radius-sm,8px) var(--radius-sm,8px) 0;padding:.75rem 1rem;font-size:.84rem;color:var(--earth,#0F172A);line-height:1.55;}
              .ia-box p{margin:0;}
              .nota-textarea{width:100%;padding:.65rem .85rem;border:1.5px solid var(--gray-300,#CBD5E1);border-radius:var(--radius-sm,8px);font-size:.85rem;font-family:inherit;color:var(--earth,#0F172A);background:var(--gray-50,#FAFAFA);outline:none;resize:vertical;min-height:80px;transition:border-color .2s;}
              .nota-textarea:focus{border-color:var(--sun,#2563EB);background:var(--white,#fff);}
              .btn-guardar-nota{background:var(--sun,#2563EB);color:white;border:none;padding:.5rem 1rem;border-radius:var(--radius-sm,8px);font-size:.84rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s;align-self:flex-start;}
              .btn-guardar-nota:hover:not(:disabled){background:var(--sun-dark,#1E40AF);}
              .btn-guardar-nota:disabled{opacity:.5;cursor:not-allowed;}

              /* ── Timeline ── */
              .timeline-count{background:var(--sun-light,#EFF6FF);color:var(--sun,#2563EB);font-size:.7rem;font-weight:700;padding:.1rem .4rem;border-radius:999px;margin-left:.35rem;}
              .timeline-empty{font-size:.83rem;color:var(--gray-400,#94A3B8);margin:0;}
              .timeline{display:flex;flex-direction:column;gap:0;}
              .timeline-item{position:relative;padding-left:1.5rem;padding-bottom:1rem;}
              .timeline-dot{position:absolute;left:0;top:.3rem;width:8px;height:8px;border-radius:50%;background:var(--sun,#2563EB);}
              .timeline-line{position:absolute;left:3.5px;top:1rem;bottom:0;width:1px;background:var(--gray-200,#E2E8F0);}
              .timeline-content{display:flex;flex-direction:column;gap:.25rem;}
              .timeline-meta{display:flex;align-items:center;justify-content:space-between;gap:.5rem;}
              .timeline-tipo{font-size:.76rem;font-weight:600;color:var(--earth,#0F172A);text-transform:capitalize;}
              .timeline-fecha{font-size:.72rem;color:var(--gray-400,#94A3B8);}
              .timeline-nota{font-size:.82rem;color:var(--gray-500,#64748B);margin:0;line-height:1.4;}

              /* ── Badge Etapa ── */
              .badge-etapa{display:inline-flex;align-items:center;padding:.2rem .6rem;border-radius:100px;font-size:.72rem;font-weight:700;white-space:nowrap;transition:color .2s,background .2s;}

              /* ── Selector Etapa (select en tabla) ── */
              .selector-etapa{padding:.22rem .55rem;border-radius:8px;font-size:.75rem;font-weight:600;outline:none;font-family:inherit;border-width:1.5px;border-style:solid;transition:color .2s,background .2s,border-color .2s;}
              .selector-etapa-nuevo      {color:#1D4ED8;background:#EFF6FF;border-color:rgba(29,78,216,.2);}
              .selector-etapa-contactado {color:#7C3AED;background:#F5F3FF;border-color:rgba(124,58,237,.2);}
              .selector-etapa-negociacion{color:#D97706;background:#FFFBEB;border-color:rgba(217,119,6,.2);}
              .selector-etapa-cierre     {color:#059669;background:#ECFDF5;border-color:rgba(5,150,105,.2);}
              .selector-etapa-perdido    {color:#DC2626;background:#FEF2F2;border-color:rgba(220,38,38,.2);}

              /* ── Dark mode neon — Badge ── */
              .crm-root.dark .badge-etapa-nuevo      {color:#38BDF8!important;background:rgba(56,189,248,.12)!important;}
              .crm-root.dark .badge-etapa-contactado {color:#A78BFA!important;background:rgba(167,139,250,.12)!important;}
              .crm-root.dark .badge-etapa-negociacion{color:#FCD34D!important;background:rgba(252,211,77,.12)!important;}
              .crm-root.dark .badge-etapa-cierre     {color:#34D399!important;background:rgba(52,211,153,.12)!important;}
              .crm-root.dark .badge-etapa-perdido    {color:#FF7070!important;background:rgba(255,112,112,.12)!important;}

              /* ── Dark mode neon — Selector ── */
              .crm-root.dark .selector-etapa-nuevo      {color:#38BDF8;background:rgba(56,189,248,.1);border-color:rgba(56,189,248,.22);}
              .crm-root.dark .selector-etapa-contactado {color:#A78BFA;background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.22);}
              .crm-root.dark .selector-etapa-negociacion{color:#FCD34D;background:rgba(252,211,77,.1);border-color:rgba(252,211,77,.22);}
              .crm-root.dark .selector-etapa-cierre     {color:#34D399;background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.22);}
              .crm-root.dark .selector-etapa-perdido    {color:#FF7070;background:rgba(255,112,112,.1);border-color:rgba(255,112,112,.22);}
              /* opciones del select en dark */
              .crm-root.dark .selector-etapa option{background:#0F1829;color:#E2E8F0;}
            `}</style>

            <div className="page-header">
                <div>
                    <h1 className="page-title">CRM — Gestión de Leads</h1>
                    <p className="page-subtitle">
                        {loading ? 'Cargando...' : `${total} clientes en total`}
                    </p>
                </div>
            </div>

            <section className="hot-section">
                <div className="section-label">
                    <FaFire style={{ color: '#DC2626' }} /> <span>Alta Intención</span>
                    {hotLeads.length > 0 && (
                        <span className="hot-badge">{hotLeads.length}</span>
                    )}
                </div>
                {hotLeads.length === 0 ? (
                    <div className="hot-empty">
                        <FaMoon style={{ opacity: .5 }} />
                        <span>Sin leads de alta intención por ahora. Aparecen aquí los calificados por IA con puntuación ≥ 70.</span>
                    </div>
                ) : (
                    <div className="hot-scroll">
                        {hotLeads.map(c => (
                            <HotLeadCard
                                key={c.id}
                                cliente={c}
                                onClick={() => setClienteSeleccionado(c.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            <div className="tabla-section">
                <div className="tabla-toolbar">
                    <div className="search-wrap">
                        <span className="search-icon"><FaSearch size={13} /></span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Buscar por nombre o teléfono..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>

                    <select
                        className="filter-select"
                        value={filtroEtapa}
                        onChange={e => setFiltroEtapa(e.target.value)}
                    >
                        <option value="">Todas las etapas</option>
                        {ETAPAS.map(e => (
                            <option key={e} value={e}>{ETAPA_META[e]?.label ?? e}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={filtroOrigen}
                        onChange={e => setFiltroOrigen(e.target.value)}
                    >
                        <option value="">Todos los orígenes</option>
                        <option value="web">Web</option>
                        <option value="telegram">Telegram</option>
                        <option value="referido">Referido</option>
                    </select>
                </div>

                {seleccionados.size > 0 && (
                    <div className="seleccion-bar">
                        <span>{seleccionados.size} seleccionados</span>
                        <button className="btn-accion-masiva" onClick={() => setSeleccionados(new Set())}>
                            Deseleccionar
                        </button>
                    </div>
                )}

                <div className="tabla-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={seleccionados.size === clientes.length && clientes.length > 0}
                                        onChange={toggleTodos}
                                    />
                                </th>
                                <th>Cliente</th>
                                <th>Teléfono</th>
                                <th>Origen</th>
                                <th>Etapa</th>
                                <th>Lead</th>
                                <th>Última actividad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="tabla-estado">
                                            <div className="spinner" style={{ margin: '0 auto' }} />
                                        </div>
                                    </td>
                                </tr>
                            ) : clientes.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="tabla-estado">
                                            <div className="tabla-estado-icon"><FaSearch size={28} style={{ opacity: .4 }} /></div>
                                            <p>No se encontraron clientes con los filtros aplicados.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                clientes.map(c => (
                                    <tr
                                        key={c.id}
                                        className={seleccionados.has(c.id) ? 'selected' : ''}
                                        onClick={() => setClienteSeleccionado(c.id)}
                                    >
                                        <td onClick={e => { e.stopPropagation(); toggleSeleccion(c.id); }}>
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={seleccionados.has(c.id)}
                                                onChange={() => toggleSeleccion(c.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="cliente-nombre">{c.nombre ?? '—'}</div>
                                        </td>
                                        <td>
                                            <span className="cliente-tel">{c.telefono ?? '—'}</span>
                                        </td>
                                        <td>
                                            {(() => {
                                                if (!c.origen) return '—';
                                                const meta = ORIGEN_META[c.origen];
                                                if (!meta) return c.origen;
                                                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>{meta.icon} {meta.label}</span>;
                                            })()}
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <SelectorEtapa
                                                clienteId={c.id}
                                                etapaActual={c.etapa}
                                                onCambio={handleEtapaCambio}
                                            />
                                        </td>
                                        <td>
                                            {c.puntuacion_lead != null ? (
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: c.puntuacion_lead >= 70 ? '#DC2626' : c.puntuacion_lead >= 40 ? '#D97706' : 'var(--gray-500)',
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                }}>
                                                    {c.puntuacion_lead >= 70 ? <FaFire size={12} /> : <FaBed size={12} style={{ opacity: .6 }} />} {c.puntuacion_lead}/100
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td style={{ color: 'var(--gray-500)', fontSize: '0.82rem' }}>
                                            {formatFecha(c.ultima_actividad ?? c.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && total > PAGE_SIZE && (
                    <div className="paginacion">
                        <span className="paginacion-info">
                            Mostrando {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
                        </span>
                        <div className="paginacion-btns">
                            <button
                                className="pag-btn"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                ← Anterior
                            </button>
                            {Array.from({ length: Math.min(totalPaginas, 5) }).map((_, i) => {
                                const p = i + 1;
                                return (
                                    <button
                                        key={p}
                                        className={`pag-btn ${page === p ? 'active' : ''}`}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                className="pag-btn"
                                onClick={() => setPage(p => Math.min(totalPaginas, p + 1))}
                                disabled={page === totalPaginas}
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {clienteSeleccionado !== null && (
                <ClienteDrawer
                    clienteId={clienteSeleccionado}
                    onClose={() => setClienteSeleccionado(null)}
                    onEtapaCambio={handleEtapaCambio}
                />
            )}
        </>
    );
}