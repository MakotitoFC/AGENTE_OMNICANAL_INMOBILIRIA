'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/Logo';
import { FaExclamationTriangle, FaMoon, FaSun, FaEye, FaEyeSlash } from 'react-icons/fa';

// ─── Mensajes de error Supabase → español ─────────────────────────────────────
function traducirError(msg: string): string {
    if (msg.includes('Invalid login credentials'))   return 'Correo o contraseña incorrectos.';
    if (msg.includes('Email not confirmed'))         return 'Debes confirmar tu correo antes de ingresar.';
    if (msg.includes('Too many requests'))           return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    if (msg.includes('User not found'))              return 'No existe una cuenta con ese correo.';
    if (msg.includes('Network'))                     return 'Error de conexión. Verifica tu internet.';
    return 'Ocurrió un error. Inténtalo de nuevo.';
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function LoginForm() {
    const router       = useRouter();
    const searchParams = useSearchParams();
    const redirect     = searchParams.get('redirect') ?? '/crm';

    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [showPwd,  setShowPwd]  = useState(false);
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    // Restaurar tema
    useEffect(() => {
        if (localStorage.getItem('theme') === 'dark') setDarkMode(true);
    }, []);

    // Si ya hay sesión activa → entrar directo
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.replace(redirect);
        });
    }, [redirect, router]);

    const toggleDark = () =>
        setDarkMode(d => { localStorage.setItem('theme', !d ? 'dark' : 'light'); return !d; });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email:    email.trim().toLowerCase(),
            password: password,
        });

        if (authError) {
            setError(traducirError(authError.message));
            setLoading(false);
            return;
        }

        // Éxito → navegar
        router.replace(redirect);
    };

    return (
        <div className={darkMode ? 'dark' : ''} style={{ minHeight: '100vh' }}>
            <style>{`
              /* ─── fondo ─── */
              .login-bg{position:fixed;inset:0;z-index:0;background:linear-gradient(135deg,#F0F4FF 0%,#E8F0FE 50%,#F5F0FF 100%);}
              .dark .login-bg{background:linear-gradient(135deg,#04070F 0%,#080C1A 50%,#060A15 100%);}

              /* ─── wrapper ─── */
              .login-wrap{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem;}

              /* ─── card ─── */
              .login-card{background:#fff;border-radius:20px;padding:2.5rem 2rem;width:100%;max-width:400px;box-shadow:0 8px 40px rgba(15,23,42,.1);}
              .dark .login-card{background:#0C1422;box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 0 1px rgba(0,212,255,.07);}

              /* ─── logo área ─── */
              .login-logo{display:flex;flex-direction:column;align-items:center;gap:.5rem;margin-bottom:1.5rem;}
              .login-logo-subtitle{font-size:.78rem;color:#64748B;font-weight:500;}
              .dark .login-logo-subtitle{color:#475569;}

              /* ─── divider ─── */
              .login-divider{height:1px;background:#F1F5F9;margin-bottom:1.5rem;}
              .dark .login-divider{background:rgba(255,255,255,.06);}

              /* ─── fields ─── */
              .field{display:flex;flex-direction:column;gap:.3rem;margin-bottom:.9rem;}
              .field label{font-size:.82rem;font-weight:600;color:#374151;}
              .field-input-wrap{position:relative;}
              .field input{width:100%;padding:.65rem .9rem;border-radius:9px;border:1.5px solid #E2E8F0;font-size:.9rem;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .2s,box-shadow .2s;}
              .field input:focus{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.1);}
              .field input.has-eye{padding-right:2.5rem;}
              .dark .field label{color:#CBD5E1;}
              .dark .field input{background:#111827;border-color:rgba(99,179,237,.18);color:#F1F5F9;}
              .dark .field input:focus{border-color:#00D4FF;background:#0F1829;box-shadow:0 0 0 3px rgba(0,212,255,.1);}
              .btn-eye{position:absolute;right:.75rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#94A3B8;display:flex;align-items:center;padding:0;}
              .btn-eye:hover{color:#475569;}

              /* ─── error ─── */
              .alert-error{display:flex;align-items:center;gap:.5rem;background:#FEF2F2;color:#DC2626;padding:.65rem .9rem;border-radius:9px;font-size:.82rem;margin-bottom:.9rem;border:1px solid #FECACA;}
              .dark .alert-error{background:rgba(239,68,68,.1);color:#FCA5A5;border-color:rgba(239,68,68,.2);}

              /* ─── botón ─── */
              .btn-login{width:100%;padding:.75rem;border-radius:9px;border:none;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;font-size:.95rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.5rem;transition:all .2s;font-family:inherit;}
              .btn-login:hover:not(:disabled){background:linear-gradient(135deg,#3B82F6,#2563EB);box-shadow:0 4px 16px rgba(37,99,235,.3);}
              .btn-login:disabled{opacity:.6;cursor:not-allowed;}
              .dark .btn-login{background:linear-gradient(135deg,#0EA5E9,#0369A1);box-shadow:0 0 18px rgba(14,165,233,.3);}
              .dark .btn-login:hover:not(:disabled){background:linear-gradient(135deg,#38BDF8,#0EA5E9);}

              /* ─── spinner ─── */
              .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;}
              @keyframes spin{to{transform:rotate(360deg);}}

              /* ─── footer ─── */
              .login-footer{text-align:center;margin-top:1.25rem;}
              .login-footer a{font-size:.8rem;color:#94A3B8;text-decoration:none;}
              .login-footer a:hover{color:#2563EB;}
              .dark .login-footer a:hover{color:#00D4FF;}

              /* ─── dark toggle ─── */
              .login-dark-btn{position:absolute;top:1.1rem;right:1.1rem;width:32px;height:32px;border-radius:50%;background:#F1F5F9;border:1px solid #E2E8F0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.9rem;color:#64748B;transition:all .2s;outline:none;}
              .login-dark-btn:hover{background:#E2E8F0;transform:rotate(12deg);}
              .dark .login-dark-btn{background:rgba(0,212,255,.08);border-color:rgba(0,212,255,.18);color:#00D4FF;}
            `}</style>

            <div className="login-bg" />
            <div className="login-wrap">
                <div className="login-card" style={{ position: 'relative' }}>

                    {/* Toggle dark */}
                    <button className="login-dark-btn" onClick={toggleDark} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
                        {darkMode ? <FaSun size={14} /> : <FaMoon size={14} />}
                    </button>

                    {/* Logo */}
                    <div className="login-logo">
                        <Logo width={52} height={52} dark={false} showText={true} />
                        <span className="login-logo-subtitle">Panel de Gestión Inmobiliaria</span>
                    </div>

                    <div className="login-divider" />

                    <form onSubmit={handleLogin} noValidate>

                        {error && (
                            <div className="alert-error">
                                <FaExclamationTriangle size={13} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Email */}
                        <div className="field">
                            <label htmlFor="email">Correo electrónico</label>
                            <div className="field-input-wrap">
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="correo@empresa.com"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError(''); }}
                                    required
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div className="field">
                            <label htmlFor="password">Contraseña</label>
                            <div className="field-input-wrap">
                                <input
                                    id="password"
                                    type={showPwd ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    required
                                    autoComplete="current-password"
                                    className="has-eye"
                                />
                                <button type="button" className="btn-eye" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                                    {showPwd ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-login" disabled={loading} style={{ marginTop: '0.5rem' }}>
                            {loading ? <><span className="spinner" /> Ingresando…</> : 'Ingresar al Sistema'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <a href="/">← Volver al portal público</a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
