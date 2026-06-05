'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import TelegramBubble from '@/components/TelegramBubble';
import Logo from '@/components/Logo';
import {
    FaMoon, FaSun, FaFire, FaHome, FaMapMarkerAlt,
    FaRulerCombined, FaBed, FaTimes, FaCheckCircle,
    FaLock, FaSearch, FaCheck,
} from 'react-icons/fa';

interface Propiedad {
    id: string;
    direccion: string;
    distrito?: string;
    tipo?: string;
    area_m2?: number;
    dormitorios?: number;
    precio?: number;
    precio_venta?: number;
    moneda: string;
    estado: string;
    descripcion?: string;
    imagenes?: string[];
    latitud?: number;
    longitud?: number;
}

interface FormData { nombre: string; telefono: string; }

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? 'https://t.me/tu_bot_aqui';

const formatPrecio = (precio?: number, moneda = 'PEN') => {
    if (!precio) return 'Consultar precio';
    return `${moneda === 'PEN' ? 'S/' : '$'} ${precio.toLocaleString('es-PE')}`;
};

const ESTADO_META: Record<string, { label: string; color: string; bg: string }> = {
    disponible: { label: 'Disponible', color: '#2E7D4F', bg: '#E8F5EE' },
    oferta: { label: 'Oferta', color: '#C47E0A', bg: '#FFF3DC' },
    reservado: { label: 'Reservado', color: '#3730A3', bg: '#EEF2FF' },
    vendido: { label: 'Vendido', color: '#6B7280', bg: '#F3F4F6' },
};

function ModalCaptura({ propiedad, onClose }: { propiedad: Propiedad; onClose: () => void }) {
    const [form, setForm] = useState<FormData>({ nombre: '', telefono: '' });
    const [errors, setErrors] = useState<Partial<FormData>>({});
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const validate = () => {
        const errs: Partial<FormData> = {};
        if (!form.nombre.trim() || form.nombre.trim().length < 2) errs.nombre = 'Ingresa tu nombre completo';
        if (form.telefono.replace(/\D/g, '').length !== 9) errs.telefono = 'El celular debe tener 9 dígitos';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setStatus('loading');
        try {
            const res = await fetch(`${BACKEND}/api/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: form.nombre.trim(),
                    telefono: form.telefono.replace(/\D/g, ''),
                    origen: 'web',
                    propiedad_interes: propiedad.id,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus('success');
                setMsg(data.duplicate
                    ? '¡Ya estás en nuestra lista! Un asesor te contactará pronto.'
                    : '¡Datos recibidos! Nuestro asistente te contactará en breve.');
            } else {
                setStatus('error');
                setMsg(data.error ?? 'Ocurrió un error.');
            }
        } catch {
            setStatus('error');
            setMsg('Error de conexión. Intenta de nuevo.');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                {status === 'success' ? (
                    <div className="modal-success">
                        {/* X dentro del estado éxito */}
                        <button
                            className="modal-close"
                            onClick={onClose}
                            style={{ alignSelf: 'flex-end', marginBottom: '0.25rem' }}
                        >
                            <FaTimes size={12} />
                        </button>
                        <FaCheckCircle size={48} style={{ color: '#16A34A' }} />
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>¡Listo!</h3>
                        <p style={{ color: 'var(--gray-500)', fontSize: '0.92rem' }}>{msg}</p>
                        <button className="btn-primary" onClick={onClose}>Cerrar</button>
                    </div>
                ) : (
                    <>
                        {/* Fila: título izq · X der — X DENTRO del modal */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.4rem' }}>
                            <h2 className="modal-title" style={{ margin: 0 }}>Solicitar Información</h2>
                            <button className="modal-close" onClick={onClose}><FaTimes size={12} /></button>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--sun-dark)', fontWeight: 600, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <FaMapMarkerAlt size={12} /> {propiedad.direccion}
                        </p>
                        <p style={{ fontSize: '0.86rem', color: 'var(--gray-500)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                            Déjanos tu número y nuestro asistente te contactará de inmediato.
                        </p>

                        <div className="field">
                            <label>Nombre Completo</label>
                            <input
                                type="text"
                                placeholder="Ej: Juan Pérez García"
                                value={form.nombre}
                                onChange={e => { setForm(f => ({ ...f, nombre: e.target.value })); setErrors(er => ({ ...er, nombre: undefined })); }}
                                className={errors.nombre ? 'input-error' : ''}
                                autoComplete="name"
                            />
                            {errors.nombre && <span className="field-error">{errors.nombre}</span>}
                        </div>

                        <div className="field">
                            <label>Celular</label>
                            <input
                                type="tel"
                                placeholder="Ej: 987654321"
                                value={form.telefono}
                                maxLength={9}
                                onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 9); setForm(f => ({ ...f, telefono: v })); setErrors(er => ({ ...er, telefono: undefined })); }}
                                className={errors.telefono ? 'input-error' : ''}
                                autoComplete="tel"
                            />
                            {errors.telefono && <span className="field-error">{errors.telefono}</span>}
                        </div>

                        {status === 'error' && (
                            <div className="alert-error">{msg}</div>
                        )}

                        <button className="btn-primary btn-full" onClick={handleSubmit} disabled={status === 'loading'} style={{ marginTop: '0.5rem' }}>
                            {status === 'loading' ? 'Enviando...' : 'Enviar Datos'}
                        </button>
                        <p style={{ fontSize: '0.74rem', color: 'var(--gray-500)', textAlign: 'center', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                            <FaLock size={10} /> Tus datos están seguros. No compartimos tu información.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function PropiedadDetalle() {
    const { id } = useParams<{ id: string }>();
    const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
    const [loading, setLoading] = useState(true);
    const [imagenActiva, setImagenActiva] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') setDarkMode(true);
    }, []);

    const toggleDark = () => {
        setDarkMode(d => {
            localStorage.setItem('theme', !d ? 'dark' : 'light');
            return !d;
        });
    };

    useEffect(() => {
        fetch(`${BACKEND}/api/propiedades/${id}`)
            .then(r => r.json())
            .then(json => {
                if (json.success) setPropiedad(json.data);
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <div className="spinner" />
                </div>
            </>
        );
    }

    if (!propiedad) {
        return (
            <>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                    :root { --sun: #2563EB; --earth: #0F172A; --cream: #F8FAFC; --font-display: 'Poppins', sans-serif; --font-body: 'Poppins', sans-serif; }
                    body { font-family: var(--font-body); background: var(--cream); margin: 0; }
                `}</style>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', color: '#64748B' }}>
                    <FaSearch size={40} style={{ opacity: 0.35 }} />
                    <h2 style={{ fontFamily: "var(--font-display)", color: '#0F172A' }}>Propiedad no encontrada</h2>
                    <a href="/" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>← Volver al catálogo</a>
                </div>
            </>
        );
    }

    const precio = propiedad.precio_venta ?? propiedad.precio;
    const estadoMeta = ESTADO_META[propiedad.estado] ?? { label: propiedad.estado, color: '#6B7280', bg: '#F3F4F6' };
    const imagenes = propiedad.imagenes ?? [];

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --sun: #2563EB; /* Primary blue */
          --sun-dark: #1E40AF; /* Deep blue */
          --sun-light: #EFF6FF; /* Ice blue background */
          --earth: #0F172A; /* Slate 900 text */
          --cream: #F8FAFC; /* Slate 50 base background */
          --white: #FFFFFF;
          --gray-100: #F1F5F9; --gray-200: #E2E8F0; --gray-300: #CBD5E1;
          --gray-500: #64748B; --gray-700: #475569;
          --shadow-sm: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
          --shadow-md: 0 8px 24px rgba(15,23,42,0.08);
          --shadow-lg: 0 20px 48px rgba(15,23,42,0.12);
          --radius: 12px; --radius-sm: 8px;
          --font-display: 'Poppins', Georgia, serif;
          --font-body: 'Poppins', system-ui, sans-serif;
          --transition: 0.22s cubic-bezier(0.4,0,0.2,1);
        }
        
        .dark {
          --cream: #0B0F19; /* Obsidian deep navy */
          --white: #111827; /* Slate 800 dark panel */
          --gray-100: #1F2937;
          --gray-200: #374151;
          --gray-300: #334155;
          --gray-500: #94A3B8;
          --gray-700: #E2E8F0;
          --earth: #F8FAFC;
          --sun-light: #1E293B;
          --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
          --shadow-md: 0 8px 32px rgba(0,0,0,0.4);
          --shadow-lg: 0 20px 60px rgba(0,0,0,0.5);
        }

        body { background: var(--cream); font-family: var(--font-body); color: var(--earth); transition: background var(--transition), color var(--transition); }

        /* Custom Wrapper theme transition */
        .dark-mode-wrapper {
          background: var(--cream);
          color: var(--earth);
          min-height: 100vh;
          transition: background var(--transition), color var(--transition);
        }

        /* Navbar */
        .navbar { background: rgba(255,255,255,0.8); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid var(--gray-300); padding: 0 1.5rem; position: sticky; top: 0; z-index: 50; transition: background var(--transition), border-color var(--transition); }
        .dark .navbar { background: rgba(17,24,29,0.8); }
        .navbar-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 64px; gap: 1rem; }
        .logo { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; }
        .back-link { font-size: 0.85rem; color: var(--sun); text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 0.3rem; transition: color var(--transition); }
        .back-link:hover { color: var(--sun-dark); }
        
        .btn-icon {
          background: var(--gray-100);
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-sm);
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 1rem;
          transition: all var(--transition);
          color: var(--earth);
        }
        .btn-icon:hover { background: var(--gray-300); color: var(--sun); }


        /* Layout */
        .page-wrap { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }
        .detail-grid { display: grid; grid-template-columns: 1fr 380px; gap: 2.5rem; align-items: start; }

        /* Galería */
        .gallery-main { aspect-ratio: 4/3; border-radius: var(--radius); overflow: hidden; background: var(--gray-100); margin-bottom: 0.75rem; }
        .gallery-main img { width: 100%; height: 100%; object-fit: cover; }
        .gallery-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 5rem; color: var(--gray-300); }
        .gallery-thumbs { display: flex; gap: 0.5rem; }
        .gallery-thumb {
          width: 80px; height: 60px; border-radius: 8px; overflow: hidden;
          border: 2px solid transparent; cursor: pointer; transition: border-color var(--transition);
          background: var(--gray-100); flex-shrink: 0;
        }
        .gallery-thumb.active { border-color: var(--sun); }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* Info column */
        .info-card { background: var(--white); border-radius: var(--radius); border: 1px solid var(--gray-300); padding: 1.75rem; box-shadow: var(--shadow-sm); position: sticky; top: 80px; }
        .estado-badge { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 100px; font-size: 0.75rem; font-weight: 700; margin-bottom: 1rem; }
        .prop-title { font-family: var(--font-display); font-size: 1.4rem; color: var(--earth); line-height: 1.3; margin-bottom: 0.4rem; }
        .prop-distrito { font-size: 0.9rem; color: var(--gray-500); margin-bottom: 1.25rem; }
        .prop-precio { font-family: var(--font-display); font-size: 2rem; font-weight: 700; color: var(--sun-dark); margin-bottom: 1.5rem; }
        .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }
        .spec-item { background: var(--gray-100); border-radius: var(--radius-sm); padding: 0.75rem; }
        .spec-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gray-500); margin-bottom: 0.25rem; }
        .spec-value { font-size: 1rem; font-weight: 600; color: var(--earth); }
        .divider { height: 1px; background: var(--gray-200); margin: 1.25rem 0; }
        .btn-primary { background: var(--sun); color: white; border: none; padding: 0.85rem 1.5rem; border-radius: var(--radius-sm); font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: var(--font-body); transition: all var(--transition); display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .btn-primary:hover { background: var(--sun-dark); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(232,160,32,0.4); }
        .btn-full { width: 100%; }
        .btn-telegram { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #229ED9; color: white; border: none; padding: 0.65rem; border-radius: var(--radius-sm); font-size: 0.88rem; font-weight: 600; cursor: pointer; font-family: var(--font-body); text-decoration: none; transition: background var(--transition); margin-top: 0.75rem; width: 100%; }
        .btn-telegram:hover { background: #1A8BBF; }
        .btn-disabled { background: var(--gray-300); color: var(--gray-500); cursor: not-allowed; }
        .btn-disabled:hover { transform: none; box-shadow: none; background: var(--gray-300); }

        /* Descripción */
        .desc-section { margin-top: 2rem; }
        .desc-title { font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 1rem; color: var(--earth); }
        .desc-text { font-size: 0.95rem; line-height: 1.75; color: var(--gray-700); }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(44,24,16,0.65); backdrop-filter: blur(6px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal { background: var(--white); border-radius: 18px; padding: 2rem; width: 100%; max-width: 440px; max-height: calc(100vh - 2rem); overflow-y: auto; box-shadow: var(--shadow-lg); animation: slideUp 0.25s cubic-bezier(0.4,0,0.2,1); }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-close { background: var(--gray-100); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.85rem; color: var(--gray-500); transition: all var(--transition); flex-shrink: 0; }
        .modal-close:hover { background: var(--gray-300); }
        .modal-title { font-family: var(--font-display); font-size: 1.4rem; color: var(--earth); margin-bottom: 0.3rem; }
        .modal-success { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; padding: 1rem 0; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
        .field label { font-size: 0.8rem; font-weight: 600; color: var(--earth); }
        .field input { background: var(--gray-100); border: 1.5px solid var(--gray-300); border-radius: var(--radius-sm); padding: 0.65rem 0.9rem; font-size: 0.95rem; font-family: var(--font-body); color: var(--earth); outline: none; transition: border-color var(--transition); width: 100%; }
        .field input:focus { border-color: var(--sun); background: var(--white); }
        .input-error { border-color: #C0392B !important; }
        .field-error { font-size: 0.76rem; color: #C0392B; }
        .alert-error { background: #FDECEA; color: #C0392B; padding: 0.7rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 0.5rem; }

        /* Responsive */
        @media (max-width: 860px) {
          .detail-grid { grid-template-columns: 1fr; }
          .info-card { position: static; }
        }
        @media (max-width: 540px) {
          .page-wrap { padding: 1.5rem 1rem 4rem; }
          .specs-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

            <div className={`dark-mode-wrapper ${darkMode ? 'dark' : ''}`}>
                <nav className="navbar">
                    <div className="navbar-inner">
                        <a href="/" className="logo">
                            <Logo width={36} height={36} dark={darkMode} showText={true} />
                        </a>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <button
                                onClick={toggleDark}
                                className="btn-icon"
                                aria-label="Cambiar tema"
                                title={darkMode ? 'Modo claro' : 'Modo oscuro'}
                            >
                                {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
                            </button>
                            <a href="/" className="back-link">← Volver al catálogo</a>
                        </div>
                    </div>
                </nav>

                <div className="page-wrap">
                    <div className="detail-grid">
                        <div>
                            <div className="gallery-main">
                                {imagenes.length > 0 ? (
                                    <img src={imagenes[imagenActiva]} alt={propiedad.direccion} />
                                ) : (
                                    <div className="gallery-placeholder"><FaHome size={64} style={{ opacity: 0.25 }} /></div>
                                )}
                            </div>
                            {imagenes.length > 1 && (
                                <div className="gallery-thumbs">
                                    {imagenes.slice(0, 6).map((img, i) => (
                                        <div
                                            key={i}
                                            className={`gallery-thumb ${imagenActiva === i ? 'active' : ''}`}
                                            onClick={() => setImagenActiva(i)}
                                        >
                                            <img src={img} alt="" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {propiedad.descripcion && (
                                <div className="desc-section">
                                    <h2 className="desc-title">Descripción</h2>
                                    <p className="desc-text">{propiedad.descripcion}</p>
                                </div>
                            )}
                        </div>

                        <div className="info-card">
                            <span className="estado-badge" style={{ color: estadoMeta.color, background: estadoMeta.bg }}>
                                {estadoMeta.label}
                            </span>

                            <h1 className="prop-title">{propiedad.direccion}</h1>
                            {propiedad.distrito && (
                                <p className="prop-distrito" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <FaMapMarkerAlt size={13} /> {propiedad.distrito}, Trujillo
                                </p>
                            )}

                            <p className="prop-precio">{formatPrecio(precio, propiedad.moneda)}</p>

                            <div className="specs-grid">
                                {propiedad.tipo && (
                                    <div className="spec-item">
                                        <p className="spec-label">Tipo</p>
                                        <p className="spec-value" style={{ textTransform: 'capitalize' }}>{propiedad.tipo}</p>
                                    </div>
                                )}
                                {propiedad.area_m2 && (
                                    <div className="spec-item">
                                        <p className="spec-label">Área</p>
                                        <p className="spec-value">{propiedad.area_m2} m²</p>
                                    </div>
                                )}
                                {propiedad.dormitorios != null && propiedad.dormitorios > 0 && (
                                    <div className="spec-item">
                                        <p className="spec-label">Dormitorios</p>
                                        <p className="spec-value">{propiedad.dormitorios}</p>
                                    </div>
                                )}
                            </div>

                            <div className="divider" />

                            {propiedad.estado !== 'vendido' ? (
                                <>
                                    <button
                                        className="btn-primary btn-full"
                                        onClick={() => setShowModal(true)}
                                    >
                                        Solicitar Información
                                    </button>
                                    <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-telegram">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.947l-2.95-.924c-.64-.204-.657-.64.135-.954l11.566-4.458c.537-.194 1.006.131.883.61z" />
                                        </svg>
                                        Chatear con agente en Telegram
                                    </a>
                                </>
                            ) : (
                                <button className="btn-primary btn-full btn-disabled" disabled>
                                    Propiedad no disponible
                                </button>
                            )}

                            <div style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--gray-500)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {['Asesoría personalizada', 'Financiamiento disponible', 'Documentación legal completa'].map(f => (
                                    <span key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <FaCheck size={10} style={{ color: '#16A34A' }} /> {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {showModal && (
                    <ModalCaptura propiedad={propiedad} onClose={() => setShowModal(false)} />
                )}

                <TelegramBubble />
            </div>
        </>
    );
}
