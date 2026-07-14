// ⚠️  PLACEHOLDER — REEMPLAZAR POR TU MÓDULO REAL
//
// Este archivo es un stub para que el pipeline de assessment compile y
// se pueda desplegar. Cuando pegues tu instruments.js real (con los
// ítems de PSS-10, ISI y Claridad Decisional en su redacción validada),
// este archivo se sobrescribe.
//
// La shape esperada por PublicAssessment.jsx y api/assessment/submit.js:
//
//   /** @typedef {Object} InstrumentItem
//    *  @property {string} id
//    *  @property {string} texto
//    *  @property {boolean} [reverso]  — para ítems invertidos en el scoring
//    */
//
//   /** @typedef {Object} InstrumentEscala
//    *  @property {number} min
//    *  @property {number} max
//    *  @property {string[]} labels    — largo = max - min + 1
//    */
//
//   /** @typedef {Object} Instrument
//    *  @property {string} id                  — 'pss10' | 'isi' | 'claridad'
//    *  @property {string} titulo
//    *  @property {string} [instrucciones]     — texto opcional bajo el título
//    *  @property {InstrumentEscala} escala
//    *  @property {InstrumentItem[]} items
//    *  @property {boolean} licensed           — false = el flujo lo saltea silenciosamente
//    */
//
//   export const PSS10, ISI, CLARIDAD;                 // Instrument individuales
//   export const ASSESSMENT_INSTRUMENTS = [PSS10, ISI, CLARIDAD];  // orden de presentación

export const PSS10 = {
  id: 'pss10',
  titulo: 'PSS-10 (PLACEHOLDER)',
  instrucciones: 'Reemplazar por instrucciones reales de PSS-10.',
  escala: {
    min: 0,
    max: 4,
    labels: ['Nunca', 'Casi nunca', 'A veces', 'Frecuentemente', 'Siempre'],
  },
  items: Array.from({ length: 10 }, (_, i) => ({
    id: `pss_${i + 1}`,
    texto: `PLACEHOLDER · Ítem PSS-10 número ${i + 1}`,
  })),
  licensed: true,
};

export const ISI = {
  id: 'isi',
  titulo: 'ISI (PLACEHOLDER)',
  instrucciones: 'Reemplazar por instrucciones reales del ISI.',
  escala: {
    min: 0,
    max: 4,
    labels: ['Nada', 'Poco', 'Algo', 'Mucho', 'Muchísimo'],
  },
  items: Array.from({ length: 7 }, (_, i) => ({
    id: `isi_${i + 1}`,
    texto: `PLACEHOLDER · Ítem ISI número ${i + 1}`,
  })),
  // Marcado false: el flujo lo saltea silenciosamente hasta que tengas
  // la redacción con licencia. Cambiá a true cuando esté listo.
  licensed: false,
};

export const CLARIDAD = {
  id: 'claridad',
  titulo: 'Claridad Decisional (PLACEHOLDER)',
  instrucciones: 'Reemplazar por instrucciones reales de Claridad Decisional.',
  escala: {
    min: 1,
    max: 5,
    labels: [
      'Totalmente en desacuerdo',
      'En desacuerdo',
      'Neutral',
      'De acuerdo',
      'Totalmente de acuerdo',
    ],
  },
  items: Array.from({ length: 4 }, (_, i) => ({
    id: `cla_${i + 1}`,
    texto: `PLACEHOLDER · Ítem Claridad Decisional número ${i + 1}`,
  })),
  licensed: true,
};

export const ASSESSMENT_INSTRUMENTS = [PSS10, ISI, CLARIDAD];
