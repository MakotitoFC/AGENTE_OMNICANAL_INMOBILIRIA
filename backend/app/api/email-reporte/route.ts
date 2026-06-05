import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
    try {
        const { destinatario, pdfBase64, nombreArchivo, resumen } = await request.json();

        if (!destinatario || !pdfBase64) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos requeridos: destinatario y pdfBase64' },
                { status: 400 }
            );
        }

        // ── Validar configuración de email ──────────────────────────────────
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        if (!emailUser || !emailPass || emailPass === 'tu_contrasena_de_aplicacion_aqui') {
            return NextResponse.json(
                { success: false, error: 'EMAIL_USER y EMAIL_PASS no están configurados en .env.local del backend.' },
                { status: 500 }
            );
        }

        // ── Transporter Gmail SMTP ───────────────────────────────────────────
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: emailUser, pass: emailPass },
        });

        const fecha = new Date().toLocaleDateString('es-PE', {
            day: '2-digit', month: 'long', year: 'numeric',
        });

        // ── Contenido del correo ─────────────────────────────────────────────
        const htmlBody = `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #0F172A;">
          <div style="background: linear-gradient(135deg, #1E40AF, #2563EB); padding: 32px 28px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">📊 Reporte Ejecutivo</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">
              Inmobiliaria Luz del Sol — ${fecha}
            </p>
          </div>

          <div style="background: #F8FAFC; padding: 24px 28px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
              Se adjunta el reporte ejecutivo generado el <strong>${fecha}</strong>.
            </p>

            ${resumen ? `
            <div style="background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px;">
              <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">
                Resumen del período
              </p>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                ${resumen.leads !== undefined ? `
                <tr>
                  <td style="padding: 5px 0; color: #475569;">Total Leads</td>
                  <td style="padding: 5px 0; font-weight: 700; text-align: right; color: #1D4ED8;">${resumen.leads}</td>
                </tr>` : ''}
                ${resumen.ventas !== undefined ? `
                <tr>
                  <td style="padding: 5px 0; color: #475569;">Ventas Cerradas</td>
                  <td style="padding: 5px 0; font-weight: 700; text-align: right; color: #059669;">S/ ${Number(resumen.ventas).toLocaleString('es-PE')}</td>
                </tr>` : ''}
                ${resumen.conversion !== undefined ? `
                <tr>
                  <td style="padding: 5px 0; color: #475569;">Tasa de Conversión</td>
                  <td style="padding: 5px 0; font-weight: 700; text-align: right; color: #7C3AED;">${resumen.conversion}%</td>
                </tr>` : ''}
              </table>
            </div>` : ''}

            <p style="margin: 0; font-size: 13px; color: #94A3B8;">
              Este correo fue generado automáticamente por el sistema de gestión de
              <strong>Inmobiliaria Luz del Sol</strong>. No responder a este mensaje.
            </p>
          </div>
        </div>`;

        // ── Enviar ───────────────────────────────────────────────────────────
        await transporter.sendMail({
            from: `"Inmobiliaria Luz del Sol" <${emailUser}>`,
            to:   destinatario,
            subject: `📊 Reporte Ejecutivo — ${fecha}`,
            html:  htmlBody,
            attachments: [
                {
                    filename: nombreArchivo ?? `Reporte_LuzDelSol_${new Date().toISOString().slice(0, 10)}.pdf`,
                    content:  pdfBase64,
                    encoding: 'base64',
                    contentType: 'application/pdf',
                },
            ],
        });

        return NextResponse.json({ success: true, message: `Reporte enviado a ${destinatario}` });

    } catch (error: unknown) {
        console.error('[POST /api/email-reporte]', error);
        const msg = error instanceof Error ? error.message : 'Error al enviar el correo';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
