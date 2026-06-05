'use client';

import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';

const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? 'https://t.me/Luz_del_Sol_bot';

interface Mensaje {
  id: number;
  texto: string;
  esBot: boolean;
  hora: string;
}

const getHora = () =>
  new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

/** Extrae los textos de respuesta sin importar el formato que devuelva n8n */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extraerTextos(data: any): string[] {
  if (!data) return [];

  // String plano
  if (typeof data === 'string' && data.trim()) return [data.trim()];

  if (typeof data === 'object' && !Array.isArray(data)) {
    // Formato del Respond to Webhook: { part_1, part_2, part_3, part_4 }
    const partes = [data.part_1, data.part_2, data.part_3, data.part_4, data.part_5]
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      .map((p: string) => p.trim());
    if (partes.length > 0) return partes;

    // Formato { response: { part_1, ... } }
    if (data.response && typeof data.response === 'object') {
      const partesR = [data.response.part_1, data.response.part_2, data.response.part_3, data.response.part_4, data.response.part_5]
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        .map((p: string) => p.trim());
      if (partesR.length > 0) return partesR;
    }

    // Objeto simple: { text|output|message|reply }
    const t = data.text ?? data.output ?? data.message ?? data.reply;
    if (typeof t === 'string' && t.trim()) return [t.trim()];
  }

  // Array de resultados de Telegram Bot API: [{ ok, result: { text } }]
  if (Array.isArray(data)) {
    const fromTg = data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r?.ok === true && typeof r?.result?.text === 'string')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => r.result.text as string);
    if (fromTg.length > 0) return fromTg;

    // Array de objetos n8n nativos: [{ json: { ... } }]
    const fromN8n = data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((r: any) => {
        const obj = r?.json ?? r;
        const t = obj?.text ?? obj?.output ?? obj?.message ?? obj?.reply;
        return typeof t === 'string' && t.trim() ? [t.trim()] : [];
      });
    if (fromN8n.length > 0) return fromN8n;
  }

  return [];
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let sid = sessionStorage.getItem('tg_session_id');
  if (!sid) {
    sid = `web_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('tg_session_id', sid);
  }
  return sid;
}

export default function TelegramBubble() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 0,
      texto: '¡Hola! 👋 Soy el asistente de Inmobiliaria Luz del Sol. ¿En qué puedo ayudarte hoy?',
      esBot: true,
      hora: getHora(),
    },
  ]);
  const [input, setInput] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, escribiendo]);

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 120);
  }, [abierto]);

  const agregarMensajeBot = (texto: string) => {
    setMensajes(m => [
      ...m,
      { id: Date.now() + Math.random(), texto, esBot: true, hora: getHora() },
    ]);
  };

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || enviando) return;

    setMensajes(m => [
      ...m,
      { id: Date.now(), texto, esBot: false, hora: getHora() },
    ]);
    setInput('');
    setEnviando(true);
    setEscribiendo(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: texto,
          session_id: getSessionId(),
          timestamp: new Date().toISOString(),
        }),
      });

      const envelope = await res.json();

      if (!envelope.ok) {
        setEscribiendo(false);
        agregarMensajeBot('Lo siento, hubo un problema al procesar tu consulta. Intenta de nuevo. 🙏');
        return;
      }

      const data = envelope.data;
      const partes = extraerTextos(data);

      if (partes.length === 0) {
        setEscribiendo(false);
        agregarMensajeBot('Lo siento, no recibí una respuesta válida. Intenta de nuevo. 🙏');
      } else {
        setEscribiendo(false);
        agregarMensajeBot(partes[0]);

        for (let i = 1; i < partes.length; i++) {
          await new Promise<void>(resolve => setTimeout(resolve, 450));
          agregarMensajeBot(partes[i]);
        }
      }
    } catch {
      setEscribiendo(false);
      agregarMensajeBot('⚠️ Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  return (
    <>
      <style>{`
        /* ══════════════════════════════════════════
           PANEL DE CHAT
        ══════════════════════════════════════════ */
        .tg-panel {
          position: fixed;
          right: 1.5rem;
          bottom: 5.5rem;
          width: 340px;
          max-width: calc(100vw - 2rem);
          height: 480px;
          max-height: calc(100vh - 7rem);
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 16px 60px rgba(0,0,0,0.18), 0 3px 12px rgba(0,0,0,0.1);
          z-index: 9998;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: tgSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1);
          border: 1px solid rgba(0,0,0,0.06);
        }
        @keyframes tgSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }

        /* ── Header ── */
        .tg-header {
          background: linear-gradient(135deg, #229ED9 0%, #1680B8 100%);
          padding: 0.9rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .tg-header-left  { display: flex; align-items: center; gap: 0.6rem; }
        .tg-header-right { display: flex; align-items: center; gap: 0.4rem; }

        .tg-avatar {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 800; color: white; letter-spacing: 0.03em;
          flex-shrink: 0;
        }
        .tg-name   { font-size: 0.9rem; font-weight: 700; color: white; margin: 0; }
        .tg-status {
          font-size: 0.7rem; color: rgba(255,255,255,0.75); margin: 0.08rem 0 0;
          display: flex; align-items: center; gap: 0.28rem;
        }
        .tg-status::before {
          content: '';
          width: 6px; height: 6px; border-radius: 50%;
          background: #4ADE80;
          box-shadow: 0 0 6px rgba(74,222,128,0.7);
          display: inline-block;
        }

        .tg-btn-tg {
          display: flex; align-items: center; gap: 0.3rem;
          color: rgba(255,255,255,0.88); text-decoration: none;
          font-size: 0.7rem; font-weight: 600;
          background: rgba(255,255,255,0.16);
          border-radius: 6px; padding: 0.26rem 0.58rem;
          transition: background 0.16s;
          white-space: nowrap;
        }
        .tg-btn-tg:hover { background: rgba(255,255,255,0.28); }

        .tg-btn-close {
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(255,255,255,0.16);
          border: none; color: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.16s; flex-shrink: 0;
        }
        .tg-btn-close:hover { background: rgba(255,255,255,0.3); }

        /* ── Área de mensajes ── */
        .tg-msgs {
          flex: 1; min-height: 0;
          overflow-y: auto;
          padding: 0.85rem;
          display: flex; flex-direction: column; gap: 0.45rem;
          background: #EAEFF5;
          scroll-behavior: smooth;
        }
        .tg-msgs::-webkit-scrollbar { width: 4px; }
        .tg-msgs::-webkit-scrollbar-track { background: transparent; }
        .tg-msgs::-webkit-scrollbar-thumb { background: #B9C7D4; border-radius: 4px; }

        .tg-row      { display: flex; }
        .tg-row.bot  { justify-content: flex-start; }
        .tg-row.user { justify-content: flex-end; }

        .tg-burbuja {
          max-width: 82%;
          padding: 0.5rem 0.8rem 0.45rem;
          border-radius: 14px;
          font-size: 0.83rem;
          line-height: 1.46;
        }
        .tg-row.bot  .tg-burbuja {
          background: #fff;
          color: #0F172A;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .tg-row.user .tg-burbuja {
          background: #229ED9;
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 1px 6px rgba(34,158,217,0.35);
        }
        .tg-hora {
          display: block; font-size: 0.64rem;
          opacity: 0.5; margin-top: 0.18rem; text-align: right;
        }

        /* Indicador de escritura */
        .tg-typing {
          display: flex; align-items: center; gap: 4px;
          padding: 0.6rem 0.85rem; min-height: 36px;
        }
        .tg-typing span {
          display: inline-block; width: 6px; height: 6px; border-radius: 50%;
          background: #94A3B8;
          animation: tgDot 1.2s infinite ease-in-out;
        }
        .tg-typing span:nth-child(2) { animation-delay: 0.2s; }
        .tg-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes tgDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40%            { transform: scale(1.1); opacity: 1;   }
        }

        /* ── Input ── */
        .tg-input-area {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.65rem 0.8rem;
          border-top: 1px solid #E2E8F0;
          background: #fff;
          flex-shrink: 0;
        }
        .tg-input {
          flex: 1;
          padding: 0.5rem 0.8rem;
          border: 1.5px solid #E2E8F0; border-radius: 999px;
          font-size: 0.84rem; font-family: inherit; color: #0F172A;
          background: #F8FAFC; outline: none;
          transition: border-color 0.16s;
        }
        .tg-input:focus { border-color: #229ED9; background: #fff; }
        .tg-input::placeholder { color: #94A3B8; }
        .tg-input:disabled { opacity: 0.6; cursor: not-allowed; }

        .tg-btn-send {
          width: 36px; height: 36px; border-radius: 50%;
          background: #229ED9; border: none; color: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.16s, transform 0.16s;
          flex-shrink: 0;
        }
        .tg-btn-send:hover:not(:disabled) { background: #1680B8; transform: scale(1.08); }
        .tg-btn-send:disabled { background: #CBD5E1; cursor: not-allowed; transform: none; }

        /* ══════════════════════════════════════════
           BOTÓN FLOTANTE
        ══════════════════════════════════════════ */
        .tg-bubble {
          position: fixed;
          right: 1.5rem; bottom: 1.75rem;
          z-index: 9999;
          width: 58px; height: 58px; border-radius: 50%;
          background: #229ED9;
          display: flex; align-items: center; justify-content: center;
          color: white; border: none;
          box-shadow: 0 4px 22px rgba(34,158,217,0.55), 0 2px 8px rgba(0,0,0,0.15);
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s, background 0.18s;
          animation: tgEnter 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.6s both;
          cursor: pointer; outline: none;
        }
        .tg-bubble.activo {
          background: #1680B8; transform: scale(0.94);
          box-shadow: 0 2px 12px rgba(34,158,217,0.4);
        }
        .tg-bubble:hover:not(.activo) {
          transform: scale(1.1);
          box-shadow: 0 6px 32px rgba(34,158,217,0.7), 0 2px 8px rgba(0,0,0,0.2);
        }
        .tg-bubble:active { transform: scale(0.95); }

        /* Anillo pulsante */
        .tg-bubble:not(.activo)::before {
          content: '';
          position: absolute; inset: -5px; border-radius: 50%;
          border: 2.5px solid rgba(34,158,217,0.55);
          animation: tgPulse 2.8s ease-out 1.2s infinite;
          pointer-events: none;
        }
        /* Tooltip */
        .tg-bubble:not(.activo)::after {
          content: 'Habla con un asesor';
          position: absolute;
          right: calc(100% + 12px); top: 50%;
          transform: translateY(-50%) translateX(6px);
          background: rgba(15,23,42,0.88);
          backdrop-filter: blur(6px);
          color: #fff; font-size: 0.75rem; font-weight: 600;
          padding: 0.35rem 0.72rem; border-radius: 7px;
          white-space: nowrap; pointer-events: none; opacity: 0;
          transition: opacity 0.16s, transform 0.16s;
          font-family: 'Poppins', system-ui, sans-serif;
        }
        .tg-bubble:not(.activo):hover::after {
          opacity: 1; transform: translateY(-50%) translateX(0);
        }

        @keyframes tgEnter {
          from { opacity: 0; transform: scale(0.4) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tgPulse {
          0%   { opacity: 0.75; transform: scale(1); }
          70%  { opacity: 0;    transform: scale(1.65); }
          100% { opacity: 0;    transform: scale(1.65); }
        }

        @media (max-width: 480px) {
          .tg-bubble { right: 1rem; bottom: 1.25rem; width: 52px; height: 52px; }
          .tg-bubble::after { display: none; }
          .tg-panel { right: 0.5rem; bottom: 4.8rem; width: calc(100vw - 1rem); height: 72vh; }
        }
      `}</style>

      {abierto && (
        <div className="tg-panel">
          <div className="tg-header">
            <div className="tg-header-left">
              <div className="tg-avatar">LDS</div>
              <div>
                <p className="tg-name">Asesor Luz del Sol</p>
                <p className="tg-status">En línea</p>
              </div>
            </div>
            <div className="tg-header-right">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="tg-btn-tg"
                title="Continuar en la app de Telegram"
              >
                <FaExternalLinkAlt size={10} /> Abrir en Telegram
              </a>
              <button className="tg-btn-close" onClick={() => setAbierto(false)}>
                <FaTimes size={12} />
              </button>
            </div>
          </div>

          <div className="tg-msgs">
            {mensajes.map(msg => (
              <div key={msg.id} className={`tg-row ${msg.esBot ? 'bot' : 'user'}`}>
                <div className="tg-burbuja">
                  {msg.texto}
                  <span className="tg-hora">{msg.hora}</span>
                </div>
              </div>
            ))}

            {escribiendo && (
              <div className="tg-row bot">
                <div className="tg-burbuja tg-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          <div className="tg-input-area">
            <input
              ref={inputRef}
              type="text"
              className="tg-input"
              placeholder={enviando ? 'Esperando respuesta...' : 'Escribe tu mensaje...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              maxLength={300}
              disabled={enviando}
            />
            <button
              className="tg-btn-send"
              onClick={enviar}
              disabled={!input.trim() || enviando}
              title="Enviar"
            >
              <FaPaperPlane size={13} />
            </button>
          </div>
        </div>
      )}

      <button
        className={`tg-bubble${abierto ? ' activo' : ''}`}
        onClick={() => setAbierto(o => !o)}
        aria-label={abierto ? 'Cerrar chat' : 'Hablar con un asesor'}
      >
        {abierto ? (
          <FaTimes size={21} />
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.947l-2.95-.924c-.64-.204-.657-.64.135-.954l11.566-4.458c.537-.194 1.006.131.883.61z" />
          </svg>
        )}
      </button>
    </>
  );
}
