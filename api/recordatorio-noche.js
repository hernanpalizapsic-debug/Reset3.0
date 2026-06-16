import { adminDb } from './_firebaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'Reset 3.0 <noreply@reset30.vercel.app>';
const APP_URL = 'https://reset30.vercel.app';

// Argentina is UTC-3 (no DST)
function fechaArgentina() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export default async function handler(req, res) {
  // Verify cron secret
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const hoy = fechaArgentina();

  try {
    // Get all participants
    const usuariosSnap = await adminDb
      .collection('usuarios')
      .where('rol', '==', 'participante')
      .get();

    let enviados = 0;
    const errores = [];

    await Promise.all(
      usuariosSnap.docs.map(async (userDoc) => {
        const usuario = userDoc.data();
        if (!usuario.email) return;

        // Check if they completed night reflection today
        const nocheSnap = await adminDb
          .collection('registros')
          .doc(`${userDoc.id}_${hoy}_noche`)
          .get();

        if (nocheSnap.exists) return; // Already completed

        // Send reminder
        const nombre = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ') || 'participante';
        try {
          await resend.emails.send({
            from: FROM,
            to: usuario.email,
            subject: 'Reset 3.0 · Reflexión nocturna',
            html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f9fa;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="text-align:center;margin-bottom:20px">
      <span style="font-size:40px">🌙</span>
      <h2 style="margin:8px 0 0;color:#212529;font-size:20px">Reflexión nocturna</h2>
    </div>
    <p style="font-size:15px;color:#495057">Hola ${nombre},</p>
    <p style="font-size:15px;color:#495057;line-height:1.6">
      Momento de cerrar el día. Registrá tu reflexión nocturna en Reset 3.0.
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/noche" style="background:#6B9BD2;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
        Momento noche →
      </a>
    </div>
    <p style="font-size:12px;color:#adb5bd;text-align:center;margin-top:20px">
      Solo te avisamos cuando no registraste la reflexión del día.
    </p>
  </div>
</body>
</html>`,
          });
          enviados++;
        } catch (e) {
          errores.push({ email: usuario.email, error: e.message });
        }
      })
    );

    return res.json({ ok: true, fecha: hoy, enviados, errores });
  } catch (err) {
    console.error('Recordatorio noche error:', err);
    return res.status(500).json({ error: err.message });
  }
}
