// Cálculo de tendencia entre la primera y última medición con pulso válido.
// Compartido por MiEvolucion (panel participante) y AdminMediciones (admin).
//
// Devuelve datos crudos (no strings) — cada consumer los formatea con su
// propia voz gramatical (segunda persona en MiEvolucion, tercera en admin).

const CONF_RANK = { Ninguna: 0, Baja: 1, Media: 2, Alta: 3 };

/**
 * @typedef {Object} Tendencia
 * @property {string} primeraFecha           - ISO date del primer punto válido
 * @property {string} ultimaFecha            - ISO date del último punto válido
 * @property {number} bpm1                   - BPM del primer punto
 * @property {number} bpm2                   - BPM del último punto
 * @property {'sube'|'baja'|'estable'} direction
 * @property {number} deltaAbs               - |bpm2 - bpm1|
 * @property {number} count                  - total de mediciones válidas
 * @property {{from:string,to:string,direction:'mejoro'|'bajo'}|null} confChange
 */

/**
 * @param {import('../types/biometrics').Medicion[]} medicionesAsc
 *   Lista ordenada ascendente por fecha.
 * @returns {Tendencia|null}
 */
export function calcularTendencia(medicionesAsc) {
  const validas = medicionesAsc.filter(
    (m) => m?.fuentes?.camara?.hrv?.ok === true && m.fuentes.camara.hrv.bpm != null
  );
  if (validas.length < 2) return null;

  const primera = validas[0];
  const ultima = validas[validas.length - 1];
  const bpm1 = primera.fuentes.camara.hrv.bpm;
  const bpm2 = ultima.fuentes.camara.hrv.bpm;
  const delta = bpm2 - bpm1;
  const deltaAbs = Math.abs(delta);
  const direction = deltaAbs < 2 ? 'estable' : delta < 0 ? 'baja' : 'sube';

  const c1 = CONF_RANK[primera.fuentes.camara.hrv.confidence];
  const c2 = CONF_RANK[ultima.fuentes.camara.hrv.confidence];
  let confChange = null;
  if (c1 != null && c2 != null && c1 !== c2) {
    confChange = {
      from: primera.fuentes.camara.hrv.confidence,
      to: ultima.fuentes.camara.hrv.confidence,
      direction: c2 > c1 ? 'mejoro' : 'bajo',
    };
  }

  return {
    primeraFecha: primera.fecha,
    ultimaFecha: ultima.fecha,
    bpm1,
    bpm2,
    direction,
    deltaAbs,
    count: validas.length,
    confChange,
  };
}
