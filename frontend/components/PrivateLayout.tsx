'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import {
  FaUsers, FaCoins, FaHome, FaChartBar, FaCog,
  FaSignOutAlt, FaExternalLinkAlt, FaMoon, FaSun, FaBars, FaUserCheck, FaMagic, FaFileSignature,
} from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

// ── Roles del sistema ──────────────────────────────────────────────────────────
// admin   → acceso total (usuarios, inventario, reportes, CRM, ventas)
// gerente → acceso a CRM, ventas, inventario y reportes (sin gestión de usuarios)
// asesor  → solo CRM y ventas

const NAV_ITEMS: { href: string; icon: React.ReactNode; label: string; roles: string[] }[] = [
  { href: '/crm',       icon: <FaUsers />,   label: 'CRM',       roles: ['admin', 'gerente', 'asesor'] },
  { href: '/crm/ventas',icon: <FaCoins />,   label: 'Ventas',    roles: ['admin', 'gerente', 'asesor'] },
  { href: '/calificacion', icon: <FaUserCheck />, label: 'Calificación IA', roles: ['admin', 'gerente', 'asesor'] },
  { href: '/recomendaciones', icon: <FaMagic />, label: 'Recomendación IA', roles: ['admin', 'gerente', 'asesor'] },
  { href: '/inventario',icon: <FaHome />,    label: 'Inventario',roles: ['admin', 'gerente'] },
  { href: '/reportes',  icon: <FaChartBar />,label: 'Reportes',  roles: ['admin', 'gerente'] },
  { href: '/documentos',icon: <FaFileSignature />, label: 'Documentos IA', roles: ['admin', 'gerente', 'asesor'] },
  { href: '/usuarios',  icon: <FaCog />,     label: 'Usuarios',  roles: ['admin'] },
];

interface AppUser { id: string; email: string; nombre: string; role: 'admin' | 'gerente' | 'asesor'; }


export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [appUser,     setAppUser]     = useState<AppUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [darkMode,    setDarkMode]    = useState(false);

  useEffect(() => {
    // ── Verificar sesión y leer perfil desde la tabla profiles ────────────
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }

      // El rol y nombre vienen de la tabla profiles, no de user_metadata
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, role')
        .eq('id', session.user.id)
        .single();

      setAppUser({
        id:     session.user.id,
        email:  session.user.email ?? '',
        nombre: profile?.nombre ?? session.user.email?.split('@')[0] ?? 'Usuario',
        role:   (profile?.role as 'admin' | 'gerente' | 'asesor') ?? 'asesor',
      });
      setLoading(false);
    });

    // Escuchar cambios de sesión (logout desde otra pestaña, expiración, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);


  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setDarkMode(true);
  }, []);

  const toggleDark = () => {
    setDarkMode(d => {
      const next = !d;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const isActive = (href: string) => {
    if (href === '/crm') return pathname === '/crm';
    return pathname.startsWith(href);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const navVisibles = NAV_ITEMS.filter(item => item.roles.includes(appUser?.role ?? 'asesor'));

  // Badge de color por rol
  const rolColor: Record<string, string> = { admin: '#7C3AED', gerente: '#2563EB', asesor: '#059669' };


  const currentNavItem = NAV_ITEMS.find(item => isActive(item.href));
  const activeLabel = currentNavItem ? currentNavItem.label : 'Gestión';

  return (
    <>
      <style>{`

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        :root {
          --sun: #2563EB; /* Premium primary blue */
          --sun-dark: #1E40AF; /* Deep royal blue */
          --sun-light: #EFF6FF; /* Sky ice blue background */
          --earth: #0F172A; /* Slate 900 primary text */
          --cream: #F8FAFC; /* Slate 50 clean background */
          --white: #FFFFFF;
          --sidebar-bg: #0F172A; /* Deep dark slate navy sidebar */
          --sidebar-hover: rgba(59, 130, 246, 0.1); 
          --sidebar-active: rgba(59, 130, 246, 0.18); 
          --sidebar-text: rgba(248, 250, 252, 0.65);
          --sidebar-text-active: #FFFFFF;
          --gray-100: #F1F5F9; --gray-300: #E2E8F0; --gray-500: #64748B;
          --shadow-sm: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
          --radius: 12px; --radius-sm: 8px;
          --font-display: 'Poppins', system-ui, sans-serif;
          --font-body: 'Poppins', system-ui, sans-serif;
          --transition: 0.22s cubic-bezier(0.4,0,0.2,1);
          --sidebar-w: 240px; --topbar-h: 64px;
        }

        /* ════════════════════════════════════════════════════
           DARK MODE NEON — Variables
           ════════════════════════════════════════════════════ */
        .crm-root.dark {
          --sun:       #00D4FF;                    /* neon cyan — acento principal */
          --sun-dark:  #0EA5E9;                    /* electric blue */
          --sun-light: rgba(0,212,255,0.1);        /* tint neon para fondos */
          --earth:     #E2E8F0;                    /* texto principal */
          --cream:     #06080F;                    /* fondo general */
          --white:     #0C1422;                    /* fondo de paneles/cards */
          --sidebar-bg:#050810;                    /* sidebar más profundo */
          --sidebar-hover:  rgba(0,212,255,0.08);
          --sidebar-active: rgba(0,212,255,0.14);
          --gray-50:  #070A14;
          --gray-100: #0F1829;
          --gray-200: #192438;
          --gray-300: #243450;
          --gray-400: #3A5070;
          --gray-500: #6B859E;
          --gray-700: #C4D4E8;
          --shadow-sm: 0 2px 10px rgba(0,0,0,0.6);
          --shadow-md: 0 8px 28px rgba(0,0,0,0.65);
          --shadow-lg: 0 20px 60px rgba(0,0,0,0.75);
        }

        /* ════════════════════════════════════════════════════
           DARK MODE NEON — Overrides visuales
           ════════════════════════════════════════════════════ */

        /* ── Fondo principal ── */
        .crm-root.dark { background: var(--cream); }
        .crm-root.dark .crm-main { background: var(--cream); }
        .crm-root.dark .crm-content { background: var(--cream); }

        /* ── Sidebar con nav items neon ── */
        .crm-root.dark .sidebar { background: var(--sidebar-bg); border-right: 1px solid rgba(0,212,255,0.06); }
        .crm-root.dark .nav-item.active {
          background: var(--sidebar-active);
          border-left-color: #00D4FF;
          color: #00D4FF;
          text-shadow: 0 0 12px rgba(0,212,255,0.4);
        }
        .crm-root.dark .nav-item:hover { color: #7DE8FF; }
        .crm-root.dark .sidebar-user-role { color: #00D4FF; }
        .crm-root.dark .sidebar-avatar { background: linear-gradient(135deg,#0EA5E9,#006080); box-shadow: 0 0 12px rgba(0,212,255,0.3); }
        .crm-root.dark .btn-logout:hover { background: rgba(255,80,80,0.12); color: #FF8080; }

        /* ── Topbar ── */
        .crm-root.dark .topbar {
          background: rgba(6,8,15,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom-color: rgba(0,212,255,0.1);
          box-shadow: 0 1px 0 rgba(0,212,255,0.05);
        }
        .crm-root.dark .topbar-title { color: #E2E8F0; }
        .crm-root.dark .topbar-subtitle {
          background: rgba(0,212,255,0.1);
          color: #00D4FF;
          border: 1px solid rgba(0,212,255,0.2);
        }
        .crm-root.dark .btn-portal-link { color: var(--gray-500); }
        .crm-root.dark .btn-portal-link:hover { color: #00D4FF; background: rgba(0,212,255,0.08); border-color: rgba(0,212,255,0.2); }
        .crm-root.dark .btn-dark-toggle-aesthetic {
          background: rgba(0,212,255,0.08);
          border-color: rgba(0,212,255,0.2);
          color: #00D4FF;
        }
        .crm-root.dark .btn-dark-toggle-aesthetic:hover { background: rgba(0,212,255,0.15); box-shadow: 0 0 10px rgba(0,212,255,0.2); }
        .crm-root.dark .btn-menu { color: #E2E8F0; }

        /* ── Page header ── */
        .crm-root.dark .page-title { color: #E2E8F0; }
        .crm-root.dark .page-subtitle { color: var(--gray-500); }

        /* ── Stats (ventas) ── */
        .crm-root.dark .sc {
          background: var(--white);
          border-color: rgba(0,212,255,0.1);
          box-shadow: 0 0 0 1px rgba(0,212,255,0.04), var(--shadow-sm);
        }
        .crm-root.dark .sv { color: #00D4FF; text-shadow: 0 0 14px rgba(0,212,255,0.3); }
        .crm-root.dark .sl { color: var(--gray-500); }
        .crm-root.dark .ss { color: var(--gray-400); }

        /* ── Botones globales ── */
        .crm-root.dark .btn-pri {
          background: linear-gradient(135deg,#0EA5E9,#0369A1);
          box-shadow: 0 0 16px rgba(14,165,233,0.25);
        }
        .crm-root.dark .btn-pri:hover { background: linear-gradient(135deg,#38BDF8,#0EA5E9); box-shadow: 0 0 22px rgba(56,189,248,0.4); }
        .crm-root.dark .btn-sec { background: var(--gray-100); color: #CBD5E1; border-color: var(--gray-300); }
        .crm-root.dark .btn-sec:hover { background: var(--gray-200); }

        /* ── Tabla global (ventas) ── */
        .crm-root.dark .tabla { background: var(--white); border-color: rgba(0,212,255,0.1); }
        .crm-root.dark .tabla-head { border-color: rgba(0,212,255,0.08); }
        .crm-root.dark .tabla-title { color: #E2E8F0; }
        .crm-root.dark thead { background: var(--gray-50); }
        .crm-root.dark th { color: #00D4FF; border-color: rgba(0,212,255,0.1); letter-spacing: 0.1em; }
        .crm-root.dark td { color: var(--earth); border-color: var(--gray-200); }
        .crm-root.dark tr:hover { background: rgba(0,212,255,0.05) !important; }
        .crm-root.dark tbody tr.selected { background: rgba(0,212,255,0.08) !important; }

        /* ── Hot leads section ── */
        .crm-root.dark .section-label { color: var(--gray-500); }
        .crm-root.dark .hot-badge { background: rgba(255,80,80,0.15); color: #FF7070; border: 1px solid rgba(255,80,80,0.2); }
        .crm-root.dark .hot-empty { background: var(--gray-100); border-color: rgba(0,212,255,0.08); color: var(--gray-500); }
        .crm-root.dark .hot-card {
          background: var(--white);
          border-color: rgba(0,212,255,0.1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .crm-root.dark .hot-card:hover {
          border-color: rgba(0,212,255,0.4);
          box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,255,0.15), 0 0 20px rgba(0,212,255,0.07);
          transform: translateY(-2px);
        }
        .crm-root.dark .hot-nombre { color: #E2E8F0; }
        .crm-root.dark .hot-tel { color: var(--gray-500); }
        .crm-root.dark .hot-score { color: #FF7070; text-shadow: 0 0 8px rgba(255,80,80,0.4); }
        .crm-root.dark .hot-origen { background: rgba(0,212,255,0.1); color: #00D4FF; }
        .crm-root.dark .hot-avatar { background: linear-gradient(135deg,#0EA5E9,#006080); box-shadow: 0 0 10px rgba(0,212,255,0.25); }
        .crm-root.dark .hot-resumen { color: var(--gray-500); }

        /* ── Tabla CRM (crm/page) ── */
        .crm-root.dark .tabla-section { background: var(--white); border-color: rgba(0,212,255,0.1); }
        .crm-root.dark .tabla-toolbar { border-color: rgba(0,212,255,0.08); }
        .crm-root.dark .search-input {
          background: var(--gray-100);
          border-color: rgba(0,212,255,0.15);
          color: #E2E8F0;
        }
        .crm-root.dark .search-input::placeholder { color: var(--gray-500); }
        .crm-root.dark .search-input:focus { border-color: #00D4FF; background: var(--gray-50); box-shadow: 0 0 0 3px rgba(0,212,255,0.1); }
        .crm-root.dark .filter-select { background: var(--gray-100); border-color: rgba(0,212,255,0.15); color: #CBD5E1; }
        .crm-root.dark .seleccion-bar { background: rgba(0,212,255,0.08); color: #00D4FF; border-color: rgba(0,212,255,0.12); }
        .crm-root.dark .btn-accion-masiva { background: var(--gray-200); color: #CBD5E1; border-color: var(--gray-300); }
        .crm-root.dark .btn-accion-masiva:hover { background: var(--gray-300); }
        .crm-root.dark .cliente-nombre { color: #E2E8F0; }
        .crm-root.dark .cliente-tel { color: var(--gray-500); }
        .crm-root.dark .paginacion { border-color: rgba(0,212,255,0.08); }
        .crm-root.dark .pag-btn { background: var(--gray-100); border-color: var(--gray-300); color: #CBD5E1; }
        .crm-root.dark .pag-btn:hover:not(:disabled) { background: rgba(0,212,255,0.1); border-color: #00D4FF; color: #00D4FF; }
        .crm-root.dark .pag-btn.active { background: rgba(0,212,255,0.18); border-color: #00D4FF; color: #00D4FF; font-weight:700; box-shadow: 0 0 10px rgba(0,212,255,0.2); }

        /* ── Drawer lateral ── */
        .crm-root.dark .drawer { background: var(--white); box-shadow: -4px 0 40px rgba(0,0,0,0.6), -1px 0 0 rgba(0,212,255,0.08); }
        .crm-root.dark .drawer-header { border-color: rgba(0,212,255,0.1); }
        .crm-root.dark .drawer-title { color: #E2E8F0; }
        .crm-root.dark .drawer-close { background: var(--gray-100); color: var(--gray-500); }
        .crm-root.dark .drawer-close:hover { background: var(--gray-200); color: #E2E8F0; }
        .crm-root.dark .drawer-loading { color: var(--gray-500); }
        .crm-root.dark .drawer-section-title { color: #00D4FF; letter-spacing: 0.1em; }
        .crm-root.dark .data-label { color: var(--gray-500); }
        .crm-root.dark .data-value { color: #E2E8F0; }
        .crm-root.dark .ia-box {
          background: rgba(0,212,255,0.06);
          border-left-color: #00D4FF;
          box-shadow: inset 0 0 20px rgba(0,212,255,0.04);
          color: #C8D6E8;
        }
        .crm-root.dark .nota-textarea {
          background: var(--gray-100);
          border-color: rgba(0,212,255,0.15);
          color: #E2E8F0;
        }
        .crm-root.dark .nota-textarea::placeholder { color: var(--gray-500); }
        .crm-root.dark .nota-textarea:focus { border-color: #00D4FF; background: var(--gray-50); box-shadow: 0 0 0 3px rgba(0,212,255,0.1); }
        .crm-root.dark .btn-guardar-nota {
          background: linear-gradient(135deg,#0EA5E9,#0369A1);
          box-shadow: 0 0 14px rgba(14,165,233,0.3);
        }
        .crm-root.dark .btn-guardar-nota:hover:not(:disabled) { background: linear-gradient(135deg,#38BDF8,#0EA5E9); box-shadow: 0 0 20px rgba(56,189,248,0.4); }

        /* ── Timeline ── */
        .crm-root.dark .timeline-dot { background: #00D4FF; box-shadow: 0 0 6px rgba(0,212,255,0.5); }
        .crm-root.dark .timeline-line { background: rgba(0,212,255,0.15); }
        .crm-root.dark .timeline-tipo { color: #C8D6E8; }
        .crm-root.dark .timeline-fecha { color: var(--gray-500); }
        .crm-root.dark .timeline-nota { color: var(--gray-500); }
        .crm-root.dark .timeline-count { background: rgba(0,212,255,0.1); color: #00D4FF; }

        /* ── Modales globals (overlay) ── */
        .crm-root.dark .overlay { background: rgba(0,5,15,0.7); }
        .crm-root.dark .modal { background: var(--white); border: 1px solid rgba(0,212,255,0.12); }
        .crm-root.dark .modal-head { border-color: rgba(0,212,255,0.1); }
        .crm-root.dark .modal-title { color: #E2E8F0; }
        .crm-root.dark .modal-close { background: var(--gray-100); color: var(--gray-500); }
        .crm-root.dark .modal-close:hover { background: var(--gray-200); color: #E2E8F0; }
        .crm-root.dark .modal-footer { background: var(--gray-50); border-top-color: rgba(0,212,255,0.1); }
        .crm-root.dark .fi {
          background: var(--gray-100);
          border-color: rgba(0,212,255,0.15);
          color: #E2E8F0;
        }
        .crm-root.dark .fi:focus { border-color: #00D4FF; background: var(--gray-50); box-shadow: 0 0 0 3px rgba(0,212,255,0.1); }
        .crm-root.dark .field label { color: #CBD5E1; }
        .crm-root.dark .field-hint { color: var(--gray-500); }
        .crm-root.dark .alert-error { background: rgba(239,68,68,0.1); color: #FCA5A5; border: 1px solid rgba(239,68,68,0.2); }
        .crm-root.dark .precio-box { background: rgba(0,212,255,0.06); border-color: rgba(0,212,255,0.2); color: #E2E8F0; }
        .crm-root.dark .precio-box strong { color: #00D4FF; text-shadow: 0 0 10px rgba(0,212,255,0.3); }

        body { font-family: var(--font-body); background: var(--cream); }
        .crm-root { display: flex; min-height: 100vh; max-width: 100vw; overflow-x: hidden; background: var(--cream); transition: background 0.25s; }
        .sidebar { width: var(--sidebar-w); background: var(--sidebar-bg); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; transition: transform var(--transition); }
        .sidebar-brand { padding: 1.5rem 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        
        .sidebar-nav { flex: 1; padding: 1.25rem 0.85rem; display: flex; flex-direction: column; gap: 0.35rem; }
        .sidebar-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.25); padding: 0.75rem 0.5rem 0.3rem; }
        .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); text-decoration: none; color: var(--sidebar-text); font-size: 0.88rem; font-weight: 500; transition: all var(--transition); cursor: pointer; border: none; background: none; width: 100%; text-align: left; }
        .nav-item:hover { background: var(--sidebar-hover); color: var(--sidebar-text-active); }
        .nav-item.active { background: var(--sidebar-active); color: var(--sidebar-text-active); border-left: 3px solid var(--sun); padding-left: calc(0.85rem - 3px); font-weight: 600; }
        .nav-item-icon { font-size: 1.05rem; width: 20px; text-align: center; }
        
        .sidebar-footer { padding: 1rem 0.85rem; border-top: 1px solid rgba(255,255,255,0.06); }
        .sidebar-user { display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.5rem; margin-bottom: 0.5rem; }
        .sidebar-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--sun); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: white; flex-shrink: 0; }
        .sidebar-user-info { display: flex; flex-direction: column; min-width: 0; }
        .sidebar-user-name { font-size: 0.82rem; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-user-role { font-size: 0.68rem; color: var(--sun); text-transform: capitalize; }
        
        .btn-logout { width: 100%; display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.04); border: none; color: rgba(255,255,255,0.4); font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: all var(--transition); }
        .btn-logout:hover { background: rgba(239,68,68,0.12); color: #FCA5A5; }
        
        /* ── Unified Navbar (Topbar) ── */
        .crm-main { margin-left: var(--sidebar-w); flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 100vh; transition: background 0.25s; }
        
        .topbar { 
          display: flex; 
          align-items: center; 
          justify-content: space-between;
          padding: 0 2rem; 
          height: var(--topbar-h); 
          background: rgba(255, 255, 255, 0.75); 
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--gray-300); 
          position: sticky; 
          top: 0; 
          z-index: 40; 
          transition: background var(--transition), border-color var(--transition); 
        }
        .dark .topbar {
          background: rgba(17, 24, 39, 0.75);
          border-bottom-color: var(--gray-300);
        }
        
        .topbar-left { display: flex; align-items: center; gap: 1rem; }
        .topbar-right { display: flex; align-items: center; gap: 0.75rem; }
        
        .btn-menu { display: none; background: none; border: none; font-size: 1.3rem; cursor: pointer; color: var(--earth); padding: 0.35rem; border-radius: var(--radius-sm); transition: background var(--transition); }
        .btn-menu:hover { background: var(--gray-100); }
        
        .topbar-title {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 600;
          color: var(--earth);
          letter-spacing: -0.01em;
        }
        .topbar-subtitle {
          font-size: 0.75rem;
          color: var(--gray-500);
          background: var(--gray-100);
          padding: 0.2rem 0.6rem;
          border-radius: 100px;
          font-weight: 500;
        }

        /* Sleek Aesthetic Dark Mode Toggle & Portal Link */
        .btn-portal-link {
          font-size: 0.8rem;
          color: var(--gray-500);
          text-decoration: none;
          font-weight: 500;
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-sm);
          transition: all var(--transition);
          display: flex;
          align-items: center;
          gap: 0.35rem;
          border: 1px solid transparent;
        }
        .btn-portal-link:hover {
          color: var(--sun);
          background: var(--sun-light);
          border-color: rgba(59, 130, 246, 0.15);
        }
        
        .btn-dark-toggle-aesthetic {
          background: var(--gray-100);
          border: 1px solid var(--gray-300);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1rem;
          color: var(--earth);
          transition: all var(--transition);
        }
        .btn-dark-toggle-aesthetic:hover {
          background: var(--sun-light);
          border-color: var(--sun);
          color: var(--sun);
          transform: rotate(15deg);
        }

        .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 49; backdrop-filter: blur(4px); }
        .crm-content { flex: 1; min-width: 0; padding: 2rem; overflow-x: hidden; }
        
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.open { transform: translateX(0); }
          .sidebar-overlay.open { display: block; }
          .crm-main { margin-left: 0; }
          .btn-menu { display: block; }
          .topbar { padding: 0 1rem; }
          .crm-content { padding: 1.25rem 1rem; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className={`crm-root${darkMode ? ' dark' : ''}`}>
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-brand">
            <Logo width={34} height={34} dark={true} showText={true} />
          </div>

          <nav className="sidebar-nav">
            <span className="sidebar-label">Módulos</span>
            {navVisibles.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar" style={{ background: `linear-gradient(135deg, ${rolColor[appUser?.role ?? 'asesor']}, ${rolColor[appUser?.role ?? 'asesor']}99)` }}>
                {appUser?.nombre?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{appUser?.nombre ?? appUser?.email}</span>
                <span className="sidebar-user-role" style={{ color: rolColor[appUser?.role ?? 'asesor'] }}>
                  {appUser?.role ?? 'asesor'}
                </span>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              <FaSignOutAlt size={13} /> Cerrar sesión
            </button>
          </div>
        </aside>

        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <div className="crm-main">
          <header className="topbar">
            <div className="topbar-left">
              <button className="btn-menu" onClick={() => setSidebarOpen(o => !o)}><FaBars /></button>
              <span className="topbar-title">Inmobiliaria Luz del Sol</span>
              <span className="topbar-subtitle">{activeLabel}</span>
            </div>
            <div className="topbar-right">
              <a href="/" className="btn-portal-link" target="_blank" rel="noopener noreferrer">
                <FaExternalLinkAlt size={12} /> <span>Ver portal</span>
              </a>
              <button
                className="btn-dark-toggle-aesthetic"
                onClick={toggleDark}
                title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {darkMode ? <FaSun size={15} /> : <FaMoon size={15} />}
              </button>
            </div>
          </header>
          <main className="crm-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

