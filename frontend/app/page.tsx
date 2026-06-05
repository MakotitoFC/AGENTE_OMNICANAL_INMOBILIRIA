'use client';

import { useEffect, useState, useCallback } from 'react';
import TelegramBubble from '@/components/TelegramBubble';
import Logo from '@/components/Logo';
import {
  FaMoon, FaSun, FaFire, FaHome, FaMapMarkerAlt,
  FaRulerCombined, FaBed, FaTimes, FaCheckCircle,
  FaLock, FaExclamationTriangle, FaSearch,
} from 'react-icons/fa';

interface Propiedad {
  id: string;
  direccion: string;
  distrito?: string;
  precio?: number;
  precio_venta?: number;
  moneda: string;
  tipo?: string;
  area_m2?: number;
  dormitorios?: number;
  descripcion?: string;
  imagenes?: string[];
  estado: string;
  activo: boolean;
}

interface FormData {
  nombre: string;
  telefono: string;
}

interface FormErrors {
  nombre?: string;
  telefono?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

const formatPrecio = (precio?: number, moneda = 'PEN') => {
  if (!precio) return 'Consultar precio';
  const simbolo = moneda === 'PEN' ? 'S/' : '$';
  return `${simbolo} ${precio.toLocaleString('es-PE')}`;
};

const getBadgeEstado = (estado: string) => {
  const map: Record<string, { label: string; class: string }> = {
    disponible: { label: 'Disponible', class: 'badge-disponible' },
    oferta: { label: 'Oferta', class: 'badge-oferta' },
    reservado: { label: 'Reservado', class: 'badge-reservado' },
    vendido: { label: 'Vendido', class: 'badge-vendido' },
  };
  return map[estado] ?? { label: estado, class: 'badge-default' };
};


function Navbar({ darkMode, onToggleDark }: { darkMode: boolean; onToggleDark: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner">
        <a href="/" className="logo">
          <Logo width={36} height={36} dark={darkMode} showText={true} />
        </a>

        <div className="navbar-actions">
          <button
            onClick={onToggleDark}
            className="btn-icon"
            aria-label="Cambiar tema"
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

function CardPropiedad({
  propiedad,
  onSolicitar,
}: {
  propiedad: Propiedad;
  onSolicitar: (p: Propiedad) => void;
}) {
  const badge = getBadgeEstado(propiedad.estado);
  const precio = propiedad.precio_venta ?? propiedad.precio;
  const imagenUrl = propiedad.imagenes?.[0];

  return (
    <article className="card">
      <div className="card-img-wrap">
        {imagenUrl ? (
          <img src={imagenUrl} alt={propiedad.direccion} className="card-img" loading="lazy" />
        ) : (
          <div className="card-img-placeholder">
            <FaHome size={48} style={{ opacity: 0.3 }} />
          </div>
        )}
        <span className={`badge ${badge.class}`}>{badge.label}</span>
      </div>

      <div className="card-body">
        <div className="card-meta">
          {propiedad.distrito && (
            <span className="card-distrito" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <FaMapMarkerAlt size={11} /> {propiedad.distrito}
            </span>
          )}
          {propiedad.tipo && (
            <span className="card-tipo">{propiedad.tipo}</span>
          )}
        </div>

        <h3 className="card-title">{propiedad.direccion}</h3>

        <div className="card-specs">
          {propiedad.area_m2 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <FaRulerCombined size={11} /> {propiedad.area_m2} m²
            </span>
          )}
          {propiedad.dormitorios != null && propiedad.dormitorios > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <FaBed size={11} /> {propiedad.dormitorios} dorm.
            </span>
          )}
        </div>

        <div className="card-footer">
          <p className="card-precio">{formatPrecio(precio, propiedad.moneda)}</p>
          <button
            className="btn-solicitar"
            onClick={() => onSolicitar(propiedad)}
            disabled={propiedad.estado === 'vendido'}
          >
            {propiedad.estado === 'vendido' ? 'No disponible' : 'Solicitar Información'}
          </button>
        </div>
      </div>
    </article>
  );
}


function ModalCaptura({
  propiedad,
  onClose,
}: {
  propiedad: Propiedad | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormData>({ nombre: '', telefono: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.position = 'fixed';
    html.style.top = `-${scrollY}px`;
    html.style.width = '100%';

    return () => {
      html.style.overflow = '';
      html.style.position = '';
      html.style.top = '';
      html.style.width = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.nombre.trim() || form.nombre.trim().length < 2) {
      errs.nombre = 'Ingresa tu nombre completo';
    }
    const tel = form.telefono.replace(/\D/g, '');
    if (tel.length !== 9) {
      errs.telefono = 'El teléfono debe tener exactamente 9 dígitos';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStatus('loading');

    try {
      const res = await fetch(`${BACKEND_URL}/api/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          telefono: form.telefono.replace(/\D/g, ''),
          origen: 'web',
          propiedad_interes: propiedad?.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setMensaje(
          data.duplicate
            ? '¡Ya estás en nuestra lista! Un asesor te contactará pronto. 😊'
            : '¡Datos recibidos! Nuestro asistente te contactará en breve. 🎉'
        );
      } else {
        setStatus('error');
        setMensaje(data.error ?? 'Ocurrió un error. Intenta de nuevo.');
      }
    } catch {
      setStatus('error');
      setMensaje('Error de conexión. Verifica tu internet e intenta de nuevo.');
    }
  };

  if (!propiedad) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()}>

        {status === 'success' ? (
          <div className="modal-success">
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Cerrar"
              style={{ alignSelf: 'flex-end', marginBottom: '0.25rem' }}
            >
              <FaTimes size={12} />
            </button>
            <div className="success-icon"><FaCheckCircle size={48} style={{ color: '#16A34A' }} /></div>
            <h3>¡Listo!</h3>
            <p>{mensaje}</p>
            <button className="btn-solicitar" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <div className="modal-header-top">
                <h2>Solicitar Información</h2>
                <button className="modal-close" onClick={onClose} aria-label="Cerrar">
                  <FaTimes size={12} />
                </button>
              </div>
              <p className="modal-propiedad" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <FaMapMarkerAlt size={12} /> {propiedad.direccion}
              </p>
              <p className="modal-desc">
                Déjanos tu número y nuestro asistente virtual te contactará de
                inmediato con todos los detalles.
              </p>
            </div>

            <div className="modal-body">
              <div className="field">
                <label htmlFor="nombre">Nombre Completo</label>
                <input
                  id="nombre"
                  type="text"
                  placeholder="Ej: Juan Pérez García"
                  value={form.nombre}
                  onChange={e => {
                    setForm(f => ({ ...f, nombre: e.target.value }));
                    if (errors.nombre) setErrors(er => ({ ...er, nombre: undefined }));
                  }}
                  className={errors.nombre ? 'input-error' : ''}
                  autoComplete="name"
                />
                {errors.nombre && <span className="field-error">{errors.nombre}</span>}
              </div>

              <div className="field">
                <label htmlFor="telefono">Celular</label>
                <input
                  id="telefono"
                  type="tel"
                  placeholder="Ej: 987654321"
                  value={form.telefono}
                  maxLength={9}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setForm(f => ({ ...f, telefono: val }));
                    if (errors.telefono) setErrors(er => ({ ...er, telefono: undefined }));
                  }}
                  className={errors.telefono ? 'input-error' : ''}
                  autoComplete="tel"
                />
                {errors.telefono && <span className="field-error">{errors.telefono}</span>}
              </div>

              {status === 'error' && (
                <div className="alert-error">{mensaje}</div>
              )}

              <button
                className="btn-enviar"
                onClick={handleSubmit}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <span className="btn-loading">
                    <span className="spinner" /> Enviando...
                  </span>
                ) : (
                  'Enviar Datos'
                )}
              </button>

              <p className="modal-privacy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <FaLock size={11} /> Tus datos están seguros. No compartimos tu información.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propSeleccionada, setPropSeleccionada] = useState<Propiedad | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [filtroDistrito, setFiltroDistrito] = useState('');

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


  const fetchPropiedades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ estado: 'disponible' });
      if (filtroDistrito) params.set('distrito', filtroDistrito);

      const res = await fetch(`${BACKEND_URL}/api/propiedades?${params}`);
      const json = await res.json();

      if (json.success) {

        setPropiedades(json.data?.propiedades ?? []);
      } else {
        setError(json.error ?? 'Error al cargar propiedades');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, [filtroDistrito]);

  useEffect(() => { fetchPropiedades(); }, [fetchPropiedades]);

  const distritos = [...new Set(propiedades.map(p => p.distrito).filter(Boolean))];

  return (
    <>
      <div className={darkMode ? 'dark' : ''}>
        <Navbar darkMode={darkMode} onToggleDark={toggleDark} />

        <section className="hero">
          <span className="hero-tag">Trujillo, La Libertad</span>
          <h1>Encuentra tu terreno<br /><span>ideal en el norte</span></h1>
          <p>Lotes y proyectos inmobiliarios seleccionados. Financiamiento disponible.</p>
        </section>

        {distritos.length > 0 && (
          <div className="filtros">
            <span className="filtros-label">Zona:</span>
            <button
              className={`filtro-btn ${filtroDistrito === '' ? 'active' : ''}`}
              onClick={() => setFiltroDistrito('')}
            >
              Todos
            </button>
            {distritos.map(d => (
              <button
                key={d}
                className={`filtro-btn ${filtroDistrito === d ? 'active' : ''}`}
                onClick={() => setFiltroDistrito(d ?? '')}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        <main className="catalogo">
          <div className="catalogo-header">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
              Propiedades disponibles
            </h2>
            {!loading && !error && (
              <span className="catalogo-count">
                {propiedades.length} propiedad{propiedades.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          <div className="grid">
            {loading && (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" />
              ))
            )}

            {!loading && error && (
              <div className="estado-wrap">
                <span className="estado-icon"><FaExclamationTriangle size={36} style={{ color: '#D97706', opacity: 0.7 }} /></span>
                <h3>Error de conexión</h3>
                <p>{error}</p>
                <button className="btn-solicitar" onClick={fetchPropiedades}>
                  Reintentar
                </button>
              </div>
            )}

            {!loading && !error && propiedades.length === 0 && (
              <div className="estado-wrap">
                <span className="estado-icon"><FaSearch size={36} style={{ opacity: 0.35 }} /></span>
                <h3>Sin resultados</h3>
                <p>No hay propiedades disponibles con los filtros seleccionados.</p>
              </div>
            )}

            {!loading && !error && propiedades.map(p => (
              <CardPropiedad
                key={p.id}
                propiedad={p}
                onSolicitar={setPropSeleccionada}
              />
            ))}
          </div>
        </main>

        <footer className="footer">
          <strong>Inmobiliaria Luz del Sol</strong> · Trujillo, La Libertad, Perú<br />
          © {new Date().getFullYear()} — Todos los derechos reservados
        </footer>

        {propSeleccionada && (
          <ModalCaptura
            propiedad={propSeleccionada}
            onClose={() => setPropSeleccionada(null)}
          />
        )}

        <TelegramBubble />
      </div>
    </>
  );
}