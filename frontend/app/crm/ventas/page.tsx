'use client';

import { useEffect, useState, useCallback } from 'react';
import { FaMoneyBillWave, FaCreditCard, FaUniversity, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

interface Venta {
    id: number;
    propiedad_id: string;
    cliente_id: number;
    asesor_id?: string;
    fecha_venta: string;
    precio_original: number;
    descuento_aplicado: number;
    precio_final: number;
    tipo_pago: 'contado' | 'credito' | 'financiado';
    num_cuotas: number;
    estado: 'activo' | 'cancelado' | 'completado';
    notas?: string;
    created_at: string;
    cliente?: { id: number; nombre?: string; telefono?: string };
    propiedad?: { id: string; direccion: string; distrito?: string; tipo?: string; area_m2?: number };
    asesor?: { id: string; nombre: string };
}

interface ClienteOpcion { id: number; nombre?: string; telefono?: string; etapa: string; }
interface PropiedadOpcion { id: string; direccion: string; distrito?: string; tipo?: string; area_m2?: number; precio?: number; precio_venta?: number; moneda: string; }

const TIPO_PAGO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    contado: { label: 'Contado', icon: <FaMoneyBillWave size={13} />, color: '#059669' },
    credito: { label: 'Crédito', icon: <FaCreditCard size={13} />, color: '#1D4ED8' },
    financiado: { label: 'Financiado', icon: <FaUniversity size={13} />, color: '#7C3AED' },
};

const ESTADO_VENTA: Record<string, { label: string; color: string; bg: string }> = {
    activo: { label: 'Activo', color: '#059669', bg: '#ECFDF5' },
    completado: { label: 'Completado', color: '#1D4ED8', bg: '#EFF6FF' },
    cancelado: { label: 'Cancelado', color: '#DC2626', bg: '#FEF2F2' },
};

const S = (n: number) => `S/ ${n.toLocaleString('es-PE')}`;
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

function ModalNuevaVenta({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
    const [propiedades, setPropiedades] = useState<PropiedadOpcion[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        cliente_id: '',
        propiedad_id: '',
        precio_original: '',
        descuento_aplicado: '0',
        tipo_pago: 'contado',
        num_cuotas: '0',
        fecha_venta: new Date().toISOString().split('T')[0],
        notas: '',
    });

    useEffect(() => {
        const load = async () => {
            const [cr, pr] = await Promise.all([
                fetch(`${BACKEND}/api/clientes?etapa=cierre&pageSize=100`),
                fetch(`${BACKEND}/api/propiedades?estado=disponible&pageSize=100`),
            ]);
            const cj = await cr.json();
            const pj = await pr.json();
            setClientes(cj.data?.clientes ?? []);
            setPropiedades(pj.data?.propiedades ?? []);
            setLoadingData(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (!form.propiedad_id) return;
        const p = propiedades.find(x => x.id === form.propiedad_id);
        if (p) setForm(f => ({ ...f, precio_original: String(p.precio_venta ?? p.precio ?? '') }));
    }, [form.propiedad_id, propiedades]);

    const precioFinal = Number(form.precio_original) > 0
        ? Number(form.precio_original) * (1 - Number(form.descuento_aplicado) / 100)
        : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.cliente_id || !form.propiedad_id || !form.precio_original) {
            setError('Completa los campos obligatorios: cliente, propiedad y precio.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${BACKEND}/api/ventas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cliente_id: Number(form.cliente_id),
                    propiedad_id: form.propiedad_id,
                    precio_original: Number(form.precio_original),
                    descuento_aplicado: Number(form.descuento_aplicado),
                    tipo_pago: form.tipo_pago,
                    num_cuotas: Number(form.num_cuotas),
                    fecha_venta: form.fecha_venta,
                    notas: form.notas || undefined,
                }),
            });
            const json = await res.json();
            if (json.success) { onSuccess(); onClose(); }
            else setError(json.error ?? 'Error al registrar.');
        } catch { setError('Error de conexión.'); }
        finally { setSaving(false); }
    };

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                    <h2 className="modal-title">Registrar Cierre de Venta</h2>
                    <button className="modal-close" onClick={onClose}><FaTimes size={12} /></button>
                </div>

                {loadingData ? (
                    <div style={{ padding: '3rem', textAlign: 'center', flex: 1 }}>
                        <div className="spinner" style={{ margin: '0 auto' }} />
                        <p style={{ marginTop: '1rem', color: 'var(--gray-500)', fontSize: '0.88rem' }}>Cargando clientes y propiedades...</p>
                    </div>
                ) : (

                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">

                            <div className="field">
                                <label>Cliente en etapa Cierre *</label>
                                <select className="fi" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)} required>
                                    <option value="">Seleccionar cliente...</option>
                                    {clientes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre ?? 'Sin nombre'}{c.telefono ? ` · ${c.telefono}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {clientes.length === 0 && (
                                    <span className="field-hint">
                                        <FaExclamationTriangle size={12} style={{ marginRight: '0.3rem' }} />No hay clientes en etapa "cierre". Cámbiales la etapa en CRM primero.
                                    </span>
                                )}
                            </div>

                            <div className="field">
                                <label>Propiedad Disponible *</label>
                                <select className="fi" value={form.propiedad_id} onChange={e => set('propiedad_id', e.target.value)} required>
                                    <option value="">Seleccionar propiedad...</option>
                                    {propiedades.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.direccion}{p.distrito ? ` — ${p.distrito}` : ''}{p.area_m2 ? ` (${p.area_m2} m²)` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="row-2">
                                <div className="field">
                                    <label>Precio Original (S/) *</label>
                                    <input type="number" className="fi" placeholder="0" min="0"
                                        value={form.precio_original}
                                        onChange={e => set('precio_original', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <label>Descuento (%)</label>
                                    <input type="number" className="fi" placeholder="0" min="0" max="100"
                                        value={form.descuento_aplicado}
                                        onChange={e => set('descuento_aplicado', e.target.value)}
                                    />
                                </div>
                            </div>

                            {precioFinal > 0 && (
                                <div className="precio-box">
                                    <span>Precio final:</span>
                                    <strong>{S(Math.round(precioFinal))}</strong>
                                </div>
                            )}

                            <div className="field">
                                <label>Tipo de Pago *</label>
                                <select className="fi" value={form.tipo_pago} onChange={e => set('tipo_pago', e.target.value)}>
                                    <option value="contado">Contado</option>
                                    <option value="credito">Crédito</option>
                                    <option value="financiado">Financiado</option>
                                </select>
                            </div>

                            {form.tipo_pago !== 'contado' && (
                                <div className="field">
                                    <label>Número de Cuotas</label>
                                    <input type="number" className="fi" placeholder="12" min="1"
                                        value={form.num_cuotas}
                                        onChange={e => set('num_cuotas', e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="field">
                                <label>Fecha de Venta</label>
                                <input type="date" className="fi"
                                    value={form.fecha_venta}
                                    onChange={e => set('fecha_venta', e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label>Notas (opcional)</label>
                                <textarea className="fi" rows={2}
                                    placeholder="Observaciones sobre la venta..."
                                    value={form.notas}
                                    onChange={e => set('notas', e.target.value)}
                                />
                            </div>

                            {error && <div className="alert-error"><FaExclamationTriangle size={13} />{error}</div>}
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn-sec" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn-pri" disabled={saving}>
                                {saving ? 'Registrando...' : <><FaCheck size={12} style={{ marginRight: '0.35rem' }} />Registrar Venta</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

const PAGE_SIZE = 8;

export default function VentasPage() {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [page, setPage] = useState(1);

    const fetchVentas = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND}/api/ventas?pageSize=500`);
            const json = await res.json();
            if (json.success) {
                setVentas(json.data?.ventas ?? []);
                setTotal(json.data?.total ?? 0);
            }
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchVentas(); }, [fetchVentas]);

    const activas = ventas.filter(v => v.estado !== 'cancelado');
    const totalIngresos = activas.reduce((a, v) => a + v.precio_final, 0);
    const porContado = ventas.filter(v => v.tipo_pago === 'contado').length;
    const porFinanciado = ventas.filter(v => v.tipo_pago !== 'contado').length;

    // Paginación de 8 en 8
    const totalPaginas = Math.max(1, Math.ceil(ventas.length / PAGE_SIZE));
    const pageSafe = Math.min(page, totalPaginas);
    const ventasPagina = ventas.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

    return (
        <>
            <div className="ph">
                <div>
                    <h1 className="pt">Ventas y Cierres</h1>
                    <p className="ps">{loading ? 'Cargando...' : `${total} venta${total !== 1 ? 's' : ''} registrada${total !== 1 ? 's' : ''}`}</p>
                </div>
                <button className="btn-pri" onClick={() => setShowModal(true)}>
                    + Registrar Cierre
                </button>
            </div>

            <div className="stats">
                <div className="sc">
                    <p className="sl">Total ventas</p>
                    <p className="sv">{total}</p>
                    <p className="ss">registradas</p>
                </div>
                <div className="sc">
                    <p className="sl">Ingresos</p>
                    <p className="sv" style={{ fontSize: '1.35rem' }}>{S(Math.round(totalIngresos))}</p>
                    <p className="ss">activas + completadas</p>
                </div>
                <div className="sc">
                    <p className="sl">Al contado</p>
                    <p className="sv">{porContado}</p>
                    <p className="ss">de {total} total</p>
                </div>
                <div className="sc">
                    <p className="sl">Financiadas</p>
                    <p className="sv">{porFinanciado}</p>
                    <p className="ss">crédito + financiado</p>
                </div>
            </div>

            <div className="tabla">
                <div className="tabla-head">
                    <span className="tabla-title">Registro de Ventas</span>
                </div>
                <div className="tw">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Propiedad</th>
                                <th>P. Original</th>
                                <th>Dcto.</th>
                                <th>P. Final</th>
                                <th>Pago</th>
                                <th>Estado</th>
                                <th>Asesor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9}>
                                    <div className="te">
                                        <div className="spinner" style={{ margin: '0 auto' }} />
                                    </div>
                                </td></tr>
                            ) : ventas.length === 0 ? (
                                <tr><td colSpan={9}>
                                    <div className="te">
                                        <div className="te-icon"><FaMoneyBillWave size={32} style={{ opacity: 0.35 }} /></div>
                                        <p style={{ fontSize: '0.9rem' }}>
                                            No hay ventas registradas aún.<br />
                                            Usa el botón <strong>+ Registrar Cierre</strong> para comenzar.
                                        </p>
                                    </div>
                                </td></tr>
                            ) : (
                                ventasPagina.map(v => {
                                    const tp = TIPO_PAGO[v.tipo_pago];
                                    const ev = ESTADO_VENTA[v.estado];
                                    return (
                                        <tr key={v.id}>
                                            <td style={{ color: 'var(--gray-500)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                {fecha(v.fecha_venta)}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{v.cliente?.nombre ?? '—'}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{v.cliente?.telefono ?? ''}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {v.propiedad?.direccion ?? '—'}
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                                                    {[v.propiedad?.distrito, v.propiedad?.tipo, v.propiedad?.area_m2 ? `${v.propiedad.area_m2} m²` : null].filter(Boolean).join(' · ')}
                                                </div>
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{S(v.precio_original)}</td>
                                            <td>{v.descuento_aplicado > 0 ? `${v.descuento_aplicado}%` : '—'}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--sun-dark)', whiteSpace: 'nowrap' }}>
                                                {S(Math.round(v.precio_final))}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <span style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    {tp?.icon} {tp?.label}
                                                    {v.num_cuotas > 0 ? ` (${v.num_cuotas}c)` : ''}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge" style={{ color: ev?.color, background: ev?.bg }}>
                                                    {ev?.label ?? v.estado}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                                                {v.asesor?.nombre ?? '—'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación 8 en 8 */}
                {!loading && ventas.length > PAGE_SIZE && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--gray-200, #E2E8F0)', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500, #64748B)' }}>
                            Mostrando {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, ventas.length)} de {ventas.length} ventas
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageSafe === 1}
                                style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid var(--gray-200,#E2E8F0)', background: '#fff', cursor: pageSafe === 1 ? 'not-allowed' : 'pointer', color: pageSafe === 1 ? '#CBD5E1' : '#475569', fontSize: '0.82rem', fontWeight: 600 }}>
                                ← Anterior
                            </button>
                            <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, padding: '0 0.5rem' }}>
                                {pageSafe} / {totalPaginas}
                            </span>
                            <button onClick={() => setPage(p => Math.min(totalPaginas, p + 1))} disabled={pageSafe === totalPaginas}
                                style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid var(--gray-200,#E2E8F0)', background: '#fff', cursor: pageSafe === totalPaginas ? 'not-allowed' : 'pointer', color: pageSafe === totalPaginas ? '#CBD5E1' : '#475569', fontSize: '0.82rem', fontWeight: 600 }}>
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <ModalNuevaVenta
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchVentas}
                />
            )}
        </>
    );
}
