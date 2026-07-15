#!/usr/bin/env node
/**
 * Smoke test del pipeline de assessment (pure functions, sin Firestore).
 *
 * Verifica:
 *   1. instruments.js exporta las 3 constantes + ASSESSMENT_INSTRUMENTS con la shape esperada
 *   2. scoreAssessment corre con las 3 fuentes y devuelve pss10/isi/claridad + scoredAt
 *   3. scoreAssessment maneja ISI ausente (licensed:false → flujo real)
 *   4. Las funciones tiran errores en inputs inválidos (defensive throws)
 *
 * Uso: node scripts/smokeAssessment.mjs
 */

import { scoreAssessment, scorePSS10, scoreISI, scoreClaridad, computeDelta } from '../src/lib/scoring.js';
import { PSS10, ISI, CLARIDAD, ASSESSMENT_INSTRUMENTS } from '../src/lib/instruments.js';

let failed = 0;
function check(label, cond, extra) {
  const mark = cond ? '✓' : '✗';
  console.log(`  ${mark} ${label}${extra != null ? ` — ${extra}` : ''}`);
  if (!cond) failed++;
}

console.log('=== 1. instruments.js imports ===');
check('PSS10.key === "pss10"', PSS10.key === 'pss10');
check('PSS10.items.length === 10', PSS10.items.length === 10);
check('PSS10 tiene 5 options por ítem', PSS10.items.every((i) => i.options.length === 5));
check('ISI.key === "isi"', ISI.key === 'isi');
check('ISI.items.length === 7', ISI.items.length === 7);
check('ISI.licensed === true (activo en el flujo)', ISI.licensed === true);
check('CLARIDAD.key === "claridad"', CLARIDAD.key === 'claridad');
check('CLARIDAD.items.length === 4', CLARIDAD.items.length === 4);
check('ASSESSMENT_INSTRUMENTS.length === 3', ASSESSMENT_INSTRUMENTS.length === 3);
check(
  'ASSESSMENT_INSTRUMENTS orden: pss10, isi, claridad',
  ASSESSMENT_INSTRUMENTS.map((i) => i.key).join(',') === 'pss10,isi,claridad'
);

console.log('\n=== 2. scoreAssessment con las 3 fuentes ===');
// pss10 todos 0 → invertidos (idx 3,4,6,7) suman 4*4=16, resto 0 → total 16
// isi todos 0 → total 0
// claridad todos 3 → sum 12, average 3.00
const respFull = {
  pss10: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  isi: [0, 0, 0, 0, 0, 0, 0],
  claridad: [3, 3, 3, 3],
};
const resFull = scoreAssessment(respFull);
console.log('  result:', JSON.stringify(resFull, null, 2));

check('pss10 presente', !!resFull.pss10);
check('pss10.total === 16', resFull.pss10?.total === 16, `got ${resFull.pss10?.total}`);
check('pss10.band === "moderado"', resFull.pss10?.band === 'moderado', `got ${resFull.pss10?.band}`);
check('isi presente', !!resFull.isi);
check('isi.total === 0', resFull.isi?.total === 0);
check('isi.band === "sin insomnio"', resFull.isi?.band === 'sin insomnio');
check('claridad presente', !!resFull.claridad);
check('claridad.total === 12', resFull.claridad?.total === 12);
check('claridad.average === 3', resFull.claridad?.average === 3);
check('claridad.band === "media"', resFull.claridad?.band === 'media');
check('scoredAt es ISO string', typeof resFull.scoredAt === 'string' && !Number.isNaN(Date.parse(resFull.scoredAt)));

console.log('\n=== 3. scoreAssessment sin ISI (flujo real con licensed:false) ===');
const respSinISI = { pss10: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], claridad: [3, 3, 3, 3] };
const resSinISI = scoreAssessment(respSinISI);
check('pss10 presente', !!resSinISI.pss10);
check('claridad presente', !!resSinISI.claridad);
check('isi AUSENTE (no se puntúa)', resSinISI.isi === undefined);

console.log('\n=== 4. Defensive throws en input inválido ===');
try { scorePSS10([0, 0, 0]); check('PSS10 array corto → throws', false); }
catch (e) { check('PSS10 array corto → throws', true, e.message); }

try { scorePSS10([0, 0, 0, 0, 0, 0, 0, 0, 0, 5]); check('PSS10 valor fuera de rango → throws', false); }
catch (e) { check('PSS10 valor fuera de rango → throws', true, e.message); }

try { scoreClaridad([3, 3, 3, 0]); check('Claridad valor < 1 → throws', false); }
catch (e) { check('Claridad valor < 1 → throws', true, e.message); }

console.log('\n=== 5. computeDelta (bonus, para futuro pre/post) ===');
const pre = scoreAssessment({ pss10: [3,3,3,1,1,3,1,1,3,3], claridad: [2,2,2,2] });
const post = scoreAssessment({ pss10: [1,1,1,3,3,1,3,3,1,1], claridad: [4,4,4,4] });
const d = computeDelta(pre, post);
check('delta.pss10 presente', !!d.pss10);
check('delta.pss10.delta < 0 = mejora', d.pss10.delta < 0, `delta ${d.pss10.delta}`);
check('delta.claridad.delta > 0 = mejora', d.claridad.delta > 0, `delta ${d.claridad.delta}`);
check('delta.isi ausente (no había ISI en pre/post)', d.isi === undefined);

console.log(`\n=== ${failed === 0 ? 'ALL PASS ✓' : `${failed} FAILURES ✗`} ===`);
process.exit(failed === 0 ? 0 : 1);
