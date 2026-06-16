import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'Reset 3.0 <noreply@reset30.vercel.app>';
const APP_URL = 'https://reset30.vercel.app';

function htmlBienvenida(nombre) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f9fa;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:48px">🧠</span>
      <h1 style="margin:8px 0 4px;color:#37b24d;font-size:24px">Reset 3.0</h1>
      <p style="color:#868e96;margin:0;font-size:14px">Regulación del Sistema Nervioso</p>
    </div>
    <p style="font-size:16px;color:#212529">Hola ${nombre},</p>
    <p style="font-size:15px;color:#495057;line-height:1.6">
      Tu registro en <strong>Reset 3.0</strong> fue exitoso.
    </p>
    <p style="font-size:15px;color:#495057;line-height:1.6">
      Reset 3.0 es un programa de 28 días para regular tu sistema nervioso autónomo.
      Cada día vas a encontrar un flujo matutino guiado (~20 min) y un momento de reflexión nocturna.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${APP_URL}" style="background:#51CF66;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
        Ir a la app →
      </a>
    </div>
    <p style="font-size:13px;color:#868e96;text-align:center;margin-top:24px;border-top:1px solid #dee2e6;padding-top:16px">
      Reset 3.0 · ${APP_URL}
    </p>
  </div>
</body>
</html>`;
}

function htmlRecordatorio(nombre, tipo) {
  const esMañana = tipo === 'manana';
  const icono = esMañana ? '🌅' : '🌙';
  const titulo = esMañana ? 'Tu práctica de hoy' : 'Reflexión nocturna';
  const cuerpo = esMañana
    ? 'Recordatorio: tu flujo diario de Reset 3.0 está disponible. Tomáte los 20 minutos para iniciar el día desde el cuerpo.'
    : 'Momento de cerrar el día. Registrá tu reflexión nocturna en Reset 3.0.';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f9fa;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="text-align:center;margin-bottom:20px">
      <span style="font-size:40px">${icono}</span>
      <h2 style="margin:8px 0 0;color:#212529;font-size:20px">${titulo}</h2>
    </div>
    <p style="font-size:15px;color:#495057">Hola ${nombre},</p>
    <p style="font-size:15px;color:#495057;line-height:1.6">${cuerpo}</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}" style="background:#51CF66;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
        Abrir Reset 3.0 →
      </a>
    </div>
    <p style="font-size:12px;color:#adb5bd;text-align:center;margin-top:20px">
      Solo te avisamos cuando no registraste la actividad del día.
    </p>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { tipo, email, nombre, apellido } = req.body ?? {};
  if (!tipo || !email) return res.status(400).json({ error: 'Faltan datos' });

  const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ');

  try {
    if (tipo === 'bienvenida') {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: 'Bienvenido/a a Reset 3.0',
        html: htmlBienvenida(nombreCompleto || 'participante'),
      });
      return res.json({ ok: true });
    }

    if (tipo === 'recordatorio_manana' || tipo === 'recordatorio_noche') {
      const tipoCorto = tipo === 'recordatorio_manana' ? 'manana' : 'noche';
      const asunto = tipoCorto === 'manana'
        ? 'Reset 3.0 · Tu práctica de hoy'
        : 'Reset 3.0 · Reflexión nocturna';
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: asunto,
        html: htmlRecordatorio(nombreCompleto || 'participante', tipoCorto),
      });
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Tipo no válido' });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message });
  }
}
