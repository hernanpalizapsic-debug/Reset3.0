// ⚠️  PLACEHOLDER — REEMPLAZAR POR TU MÓDULO REAL
//
// Este archivo es un stub. Cuando pegues tu scoring.js real (con las
// fórmulas validadas y las bandas correctas), este archivo se
// sobrescribe.
//
// La shape esperada por api/assessment/submit.js:
//
//   /** @typedef {{ total: number, band: string }} ScoreResult */
//   export function scorePSS10(respuestas: number[]): ScoreResult
//   export function scoreISI(respuestas: number[]): ScoreResult
//   export function scoreClaridad(respuestas: number[]): ScoreResult
//
//   /**
//    * @param {{pss10?: number[], isi?: number[], claridad?: number[]}} respuestas
//    * @returns {{pss10?: ScoreResult, isi?: ScoreResult, claridad?: ScoreResult}}
//    * Debe manejar ISI como opcional (si no viene la key, no puntúa).
//    */
//   export function scoreAssessment(respuestas): {pss10?, isi?, claridad?}
//
// Las bandas y sumatorias del placeholder NO son las oficiales — solo
// permiten que el pipeline funcione end-to-end para tests de wiring.

/** Utility: sum with reverse-scored items. */
function sum(arr) {
  let s = 0;
  for (const v of arr) s += v;
  return s;
}

export function scorePSS10(respuestas) {
  const total = sum(respuestas);
  const band = total <= 13 ? 'Bajo' : total <= 26 ? 'Moderado' : 'Alto';
  return { total, band };
}

export function scoreISI(respuestas) {
  const total = sum(respuestas);
  const band =
    total <= 7 ? 'No clínico'
      : total <= 14 ? 'Subclínico'
      : total <= 21 ? 'Moderado'
      : 'Severo';
  return { total, band };
}

export function scoreClaridad(respuestas) {
  const total = sum(respuestas);
  const band = total <= 7 ? 'Baja' : total <= 14 ? 'Media' : 'Alta';
  return { total, band };
}

export function scoreAssessment(respuestas) {
  const out = {};
  if (Array.isArray(respuestas?.pss10)) out.pss10 = scorePSS10(respuestas.pss10);
  // ISI opcional — si no viene, no puntúa (respetamos licensed:false).
  if (Array.isArray(respuestas?.isi)) out.isi = scoreISI(respuestas.isi);
  if (Array.isArray(respuestas?.claridad)) out.claridad = scoreClaridad(respuestas.claridad);
  return out;
}
