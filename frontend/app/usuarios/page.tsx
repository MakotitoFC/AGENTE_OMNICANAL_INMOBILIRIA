'use client';

import { useState, useEffect } from 'react';
import { FaUsersCog, FaPlus, FaEdit, FaTrash, FaTimes, FaUserShield, FaUser, FaSave, FaExclamationTriangle } from 'react-icons/fa';

const LS_USERS_KEY = 'luzDelSolUsuarios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Usuario {
  id: string;
  nombre: string;
  email: string;
  role: 'gerente' | 'asesor';
  telefono?: string;
  activo: boolean;
  creado_en: string;
}

interface FormUsuario {
  nombre: string;
  email: string;
  role: 'gerente' | 'asesor';
  telefono: string;
  activo: boolean;
}

// ─── Usuarios por defecto ─────────────────────────────────────────────────────
const USUARIOS_DEFAULT: Usuario[] = [
  { id: '1', nombre: 'Admin Sistema',  email: 'admin@luzdelsol.com',   role: 'gerente', telefono: '999000001', activo: true,  creado_en: '2026-01-01T00:00:00Z' },
  { id: '2', nombre: 'Ana Gerente',    email: 'gerente@luzdelsol.com', role: 'gerente', telefono: '999000002', activo: true,  creado_en: '2026-01-15T00:00:00Z' },
  { id: '3', nombre: 'Carlos Asesor',  email: 'asesor@luzdelsol.com',  role: 'asesor',  telefono: '999000003', activo: true,  creado_en: '2026-02-01T00:00:00Z' },
];

const EMPTY_FORM: FormUsuario = { nombre: '', email: '', role: 'asesor', telefono: '', activo: true };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

function RoleBadge({ role }: { role: 'gerente' | 'asesor' }) {
  const isGerente = role === 'gerente';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: isGerente ? '#EFF6FF' : '#F0FDF4',
      color: isGerente ? '#1D4ED8' : '#15803D',
      border: `1px solid ${isGerente ? '#BFDBFE' : '#BBF7D0'}`,
      padding: '0.2rem 0.65rem', borderRadius: 100,
      fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
    }}>
      {isGerente ? <FaUserShield size={10} /> : <FaUser size={10} />}
      {role}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function ModalUsuario({ usuario, onClose, onSave }: {
  usuario: Usuario | null;
  onClose: () => void;
  onSave: (form: FormUsuario) => void;
}) {
  const isEdit = !!usuario;
  const [form, setForm] = useState<FormUsuario>(
    usuario ? { nombre: usuario.nombre, email: usuario.email, role: usuario.role, telefono: usuario.telefono ?? '', activo: usuario.activo }
              : EMPTY_FORM
  );
  const [error, setError] = useState('');

  const set = (k: keyof FormUsuario, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Email inválido'); return; }
    onSave(form);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
            <FaTimes size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#FEF2F2', color: '#DC2626', padding: '0.6rem 0.9rem', borderRadius: 8, fontSize: '0.82rem' }}>
              <FaExclamationTriangle size={13} /> {error}
            </div>
          )}

          {/* Nombre */}
          <Field label="Nombre completo *">
            <input value={form.nombre} onChange={e => { set('nombre', e.target.value); setError(''); }}
              placeholder="Ej: María Rodríguez" style={inputStyle} />
          </Field>

          {/* Email */}
          <Field label="Correo electrónico *">
            <input value={form.email} onChange={e => { set('email', e.target.value); setError(''); }}
              placeholder="usuario@luzdelsol.com" type="email" style={inputStyle} />
          </Field>

          {/* Teléfono */}
          <Field label="Teléfono">
            <input value={form.telefono} onChange={e => set('telefono', e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="987654321" maxLength={9} style={inputStyle} />
          </Field>

          {/* Rol */}
          <Field label="Rol">
            <select value={form.role} onChange={e => set('role', e.target.value)} style={inputStyle}>
              <option value="asesor">Asesor — acceso a CRM y Ventas</option>
              <option value="gerente">Gerente — acceso completo</option>
            </select>
          </Field>

          {/* Activo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>Estado de la cuenta</label>
            <button
              type="button"
              onClick={() => set('activo', !form.activo)}
              style={{
                padding: '0.35rem 0.9rem', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                background: form.activo ? '#DCFCE7' : '#F1F5F9',
                color: form.activo ? '#15803D' : '#64748B',
              }}
            >
              {form.activo ? '● Activo' : '○ Inactivo'}
            </button>
          </div>

          {!isEdit && (
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8', background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
              ℹ️ En modo demo los cambios se guardan localmente. La contraseña por defecto es el nombre de usuario sin espacios en minúsculas.
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.25rem', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            Cancelar
          </button>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', border: 'none', borderRadius: 8, background: '#2563EB', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            <FaSave size={13} /> {isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.9rem', borderRadius: 8,
  border: '1.5px solid #E2E8F0', fontSize: '0.9rem', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modal, setModal] = useState<{ open: boolean; usuario: Usuario | null }>({ open: false, usuario: null });
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null);
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState<'todos' | 'gerente' | 'asesor'>('todos');

  // Cargar desde localStorage o usar defaults
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_USERS_KEY);
      setUsuarios(raw ? JSON.parse(raw) : USUARIOS_DEFAULT);
    } catch {
      setUsuarios(USUARIOS_DEFAULT);
    }
  }, []);

  const guardar = (lista: Usuario[]) => {
    setUsuarios(lista);
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(lista));
  };

  const handleSave = (form: FormUsuario) => {
    if (modal.usuario) {
      // Editar
      guardar(usuarios.map(u => u.id === modal.usuario!.id ? { ...u, ...form } : u));
    } else {
      // Crear
      const nuevo: Usuario = {
        id: genId(),
        ...form,
        creado_en: new Date().toISOString(),
      };
      guardar([nuevo, ...usuarios]);
    }
    setModal({ open: false, usuario: null });
  };

  const handleDelete = (u: Usuario) => {
    guardar(usuarios.filter(x => x.id !== u.id));
    setConfirmDelete(null);
  };

  const filtrados = usuarios.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRol = filtroRol === 'todos' || u.role === filtroRol;
    return matchSearch && matchRol;
  });

  const totalGerentes = usuarios.filter(u => u.role === 'gerente' && u.activo).length;
  const totalAsesores = usuarios.filter(u => u.role === 'asesor' && u.activo).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaUsersCog style={{ color: '#2563EB' }} /> Gestión de Usuarios
          </h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
            {totalGerentes} gerente{totalGerentes !== 1 ? 's' : ''} · {totalAsesores} asesor{totalAsesores !== 1 ? 'es' : ''} activos
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, usuario: null })}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.25rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}
        >
          <FaPlus size={13} /> Nuevo Usuario
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total usuarios', val: usuarios.length, color: '#2563EB' },
          { label: 'Activos', val: usuarios.filter(u => u.activo).length, color: '#059669' },
          { label: 'Gerentes', val: usuarios.filter(u => u.role === 'gerente').length, color: '#7C3AED' },
          { label: 'Asesores', val: usuarios.filter(u => u.role === 'asesor').length, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '1rem 1.5rem', flex: '1 1 120px', boxShadow: '0 1px 4px rgba(15,23,42,.06)', borderTop: `3px solid ${s.color}` }}>
            <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.val}</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(15,23,42,.06)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            style={{ width: '100%', padding: '0.55rem 0.9rem 0.55rem 2.2rem', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
          />
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '0.85rem' }}>🔍</span>
        </div>
        {(['todos', 'gerente', 'asesor'] as const).map(r => (
          <button key={r} onClick={() => setFiltroRol(r)} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            borderColor: filtroRol === r ? '#2563EB' : '#E2E8F0',
            background: filtroRol === r ? '#EFF6FF' : '#fff',
            color: filtroRol === r ? '#2563EB' : '#64748B',
          }}>
            {r === 'todos' ? 'Todos' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(15,23,42,.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
              {['Usuario', 'Email', 'Teléfono', 'Rol', 'Estado', 'Creado', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                  No se encontraron usuarios con los filtros aplicados
                </td>
              </tr>
            ) : filtrados.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #F8FAFC', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: u.role === 'gerente' ? '#EFF6FF' : '#F0FDF4',
                      color: u.role === 'gerente' ? '#2563EB' : '#15803D',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.9rem',
                    }}>
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{u.nombre}</span>
                  </div>
                </td>
                <td style={{ padding: '0.9rem 1rem', color: '#475569' }}>{u.email}</td>
                <td style={{ padding: '0.9rem 1rem', color: '#64748B' }}>{u.telefono || '—'}</td>
                <td style={{ padding: '0.9rem 1rem' }}><RoleBadge role={u.role} /></td>
                <td style={{ padding: '0.9rem 1rem' }}>
                  <span style={{
                    display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: 100,
                    fontSize: '0.72rem', fontWeight: 700,
                    background: u.activo ? '#DCFCE7' : '#F1F5F9',
                    color: u.activo ? '#15803D' : '#64748B',
                  }}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '0.9rem 1rem', color: '#94A3B8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fechaCorta(u.creado_en)}</td>
                <td style={{ padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => setModal({ open: true, usuario: u })}
                      style={{ padding: '0.35rem 0.65rem', border: '1px solid #E2E8F0', borderRadius: 7, background: '#fff', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}>
                      <FaEdit size={11} /> Editar
                    </button>
                    <button onClick={() => setConfirmDelete(u)}
                      style={{ padding: '0.35rem 0.65rem', border: '1px solid #FEE2E2', borderRadius: 7, background: '#FFF', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}>
                      <FaTrash size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {modal.open && (
        <ModalUsuario
          usuario={modal.usuario}
          onClose={() => setModal({ open: false, usuario: null })}
          onSave={handleSave}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: '2rem', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#EF4444' }}>
              <FaExclamationTriangle size={22} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0F172A', fontSize: '1rem' }}>¿Eliminar usuario?</h3>
            <p style={{ margin: '0 0 1.5rem', color: '#64748B', fontSize: '0.85rem' }}>
              Se eliminará a <strong>{confirmDelete.nombre}</strong> ({confirmDelete.email}). Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ padding: '0.6rem 1.25rem', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: 8, background: '#EF4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
