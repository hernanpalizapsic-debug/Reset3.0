// scoring.js
// Lógica de puntuación para los instrumentos del piloto RESET Ejecutivo.
// JS puro (ES modules). Funciona igual dentro de archivos .ts sin cambios;
// si querés tipar, se le agregan types arriba de cada función.
//
// Convención de entrada: cada instrumento recibe un array de respuestas
// crudas (tal cual las tocó el usuario), en el ORDEN de los ítems.
// Cada función valida el rango y lanza error si algo no cierra, para que
// nunca se guarde un puntaje silenciosamente mal calculado en Firebase.

// ---------------------------------------------------------------------------
// PSS-10 — Perceived Stress Scale (10 ítems, 0–4)
// Ítems POSITIVOS que van invertidos (base 1): 4, 5, 7 y 8.
// En índice base 0 del array: 3, 4, 6 y 7.
// Inversión: valor_invertido = 4 - valor.
// Total: 0–40 (mayor = más estrés).
// ---------------------------------------------------------------------------
const PSS10_REVERSE_INDICES = [3, 4, 6, 7]; // 0-based

export function scorePSS10(answers) {
  if (!Array.isArray(answers) || answers.length !== 10) {
    throw new Error(`PSS-10 requiere 10 respuestas; recibí ${answers?.length}`);
  }
  let total = 0;
  answers.forEach((raw, i) => {
    if (!Number.isInteger(raw) || raw < 0 || raw > 4) {
      throw new Error(`PSS-10 ítem ${i + 1}: valor inválido (${raw}). Debe ser 0–4.`);
    }
    total += PSS10_REVERSE_INDICES.includes(i) ? 4 - raw : raw;
  });
  return { total, band: pss10Band(total) };
}

function pss10Band(total) {
  if (total <= 13) return "bajo";
  if (total <= 26) return "moderado";
  return "alto";
}

// ---------------------------------------------------------------------------
// ISI — Insomnia Severity Index (7 ítems, 0–4). Sin ítems invertidos.
// Total: 0–28.
// ---------------------------------------------------------------------------
export function scoreISI(answers) {
  if (!Array.isArray(answers) || answers.length !== 7) {
    throw new Error(`ISI requiere 7 respuestas; recibí ${answers?.length}`);
  }
  let total = 0;
  answers.forEach((raw, i) => {
    if (!Number.isInteger(raw) || raw < 0 || raw > 4) {
      throw new Error(`ISI ítem ${i + 1}: valor inválido (${raw}). Debe ser 0–4.`);
    }
    total += raw;
  });
  return { total, band: isiBand(total) };
}

function isiBand(total) {
  if (total <= 7) return "sin insomnio";
  if (total <= 14) return "subumbral";
  if (total <= 21) return "moderado";
  return "severo";
}

// ---------------------------------------------------------------------------
// Claridad Decisional — escala propia (4 ítems, 1–5). Promedio, sin cortes.
// ---------------------------------------------------------------------------
export function scoreClaridad(answers) {
  if (!Array.isArray(answers) || answers.length !== 4) {
    throw new Error(`Claridad requiere 4 respuestas; recibí ${answers?.length}`);
  }
  let sum = 0;
  answers.forEach((raw, i) => {
    if (!Number.isInteger(raw) || raw < 1 || raw > 5) {
      throw new Error(`Claridad ítem ${i + 1}: valor inválido (${raw}). Debe ser 1–5.`);
    }
    sum += raw;
  });
  const average = Math.round((sum / 4) * 100) / 100; // 2 decimales
  // total y band se agregan para uniformar la shape con PSS-10 e ISI.
  // Bandas PROVISIONALES (escala propia, sin cortes validados): sirven para
  // display, no para interpretación clínica.
  return { average, total: sum, band: claridadBand(average) };
}

function claridadBand(average) {
  if (average < 2.5) return "baja";
  if (average < 3.75) return "media";
  return "alta";
}

// ---------------------------------------------------------------------------
// Puntaje completo de una toma (una sesión de assessment).
// Devuelve un objeto listo para guardar en Firebase.
// ---------------------------------------------------------------------------
export function scoreAssessment({ pss10, isi, claridad }) {
  const result = {
    pss10: scorePSS10(pss10),
    claridad: scoreClaridad(claridad),
    scoredAt: new Date().toISOString(),
  };
  // ISI es opcional: se puntúa solo si vino (puede estar salteado hasta
  // tener el texto oficial licenciado cargado).
  if (isi != null) {
    result.isi = scoreISI(isi);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Delta pre/post — para el informe de cierre y "Mi Evolución".
// Nota de interpretación: en PSS-10 e ISI, un delta NEGATIVO es MEJORA
// (bajó el estrés / el insomnio). En Claridad, un delta POSITIVO es mejora.
// ---------------------------------------------------------------------------
export function computeDelta(pre, post) {
  const delta = {
    pss10: {
      pre: pre.pss10.total,
      post: post.pss10.total,
      delta: post.pss10.total - pre.pss10.total, // negativo = mejora
      clinicallyRelevant: Math.abs(post.pss10.total - pre.pss10.total) >= 5,
    },
    claridad: {
      pre: pre.claridad.average,
      post: post.claridad.average,
      delta: Math.round((post.claridad.average - pre.claridad.average) * 100) / 100, // positivo = mejora
    },
  };
  if (pre.isi && post.isi) {
    delta.isi = {
      pre: pre.isi.total,
      post: post.isi.total,
      delta: post.isi.total - pre.isi.total, // negativo = mejora
      clinicallyRelevant: Math.abs(post.isi.total - pre.isi.total) >= 6, // umbral ISI
      crossedBand: pre.isi.band !== post.isi.band,
    };
  }
  return delta;
}
