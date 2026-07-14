// Cliente HTTP para /api/assessment/*.
// Sin auth Firebase — el token del URL ES la credencial.
// Errores del server llegan como {error, message} con status 4xx/5xx.

/**
 * @param {string} token
 * @returns {Promise<{empresa: string, ejecutivoNombre: string, creadoEn: number|null, expiraEn: number|null}>}
 */
export async function getAssessment(token) {
  const res = await fetch(
    '/api/assessment/get?token=' + encodeURIComponent(token)
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || body.error || `HTTP ${res.status}`);
    err.code = body.error;
    err.status = res.status;
    throw err;
  }
  return body;
}

/**
 * @param {string} token
 * @param {{pss10?: number[], isi?: number[], claridad?: number[]}} respuestas
 * @returns {Promise<{ok: true, scores: object}>}
 */
export async function submitAssessment(token, respuestas) {
  const res = await fetch('/api/assessment/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, respuestas }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || body.error || `HTTP ${res.status}`);
    err.code = body.error;
    err.status = res.status;
    throw err;
  }
  return body;
}
