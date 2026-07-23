// Funciones puras para el rollup nocturno de HRV. Sin dependencia de Firebase.
// Consumidas por api/_healthRollup.js (server-side).
//
// Ventana nocturna (fase 1): 22:00 día X-1 → 07:00 día X, en TZ local del user.
// El doc de destino es usuarios/{uid}/mediciones/{X}.
//
// SDNN y RMSSD se computan por separado y viven en campos distintos
// (hrv_sdnn_nocturno vs hrv_rmssd_nocturno). Nunca se promedian juntos.

import { getDeviceTier } from './deviceTiers.js';

const HRV_MIN_MS = 5;    // outlier — sensor error o artifact.
const HRV_MAX_MS = 300;  // outlier — fisiológicamente imposible.

const VENTANA_INICIO_HORA = 22;  // 22:00 día X-1
const VENTANA_FIN_HORA = 7;      // 07:00 día X

/**
 * Devuelve la mediana de un array de números. La mediana es más robusta que
 * la media frente a artifacts de movimiento durante el sueño.
 * @param {number[]} nums
 */
function mediana(nums) {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)];
}

/**
 * Offset (en ms) entre la timezone tz y UTC en el instante atUtcMs.
 * Positivo si tz está al este de UTC, negativo si al oeste.
 *
 * @param {number} atUtcMs
 * @param {string} tz — IANA timezone name (ej 'America/Argentina/Buenos_Aires')
 */
function tzOffsetMs(atUtcMs, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  }).formatToParts(new Date(atUtcMs));
  const map = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = Number(p.value);
  // Reconstruimos el walltime local como si fuera UTC para poder restar.
  const hour = map.hour === 24 ? 0 : map.hour;
  const walltimeAsUtc = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return walltimeAsUtc - atUtcMs;
}

/**
 * Convierte un timestamp UTC (ms) a 'YYYY-MM-DD' en la timezone dada.
 * @param {number} timestampMs
 * @param {string} tz
 */
export function bucketDayInTz(timestampMs, tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(timestampMs));
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

/**
 * Ventana nocturna en UTC ms para un fechaISO en TZ dada.
 * [desdeMs, hastaMs) = [22:00 día X-1 local, 07:00 día X local)
 *
 * @param {string} fechaISO — 'YYYY-MM-DD' (día X = día del despertar/doc)
 * @param {string} tz
 * @returns {{ desdeMs: number, hastaMs: number }}
 */
export function ventanaNocturnaMs(fechaISO, tz) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  // Instante UTC de "00:00 día X UTC" — punto de referencia estable.
  const midnightUtcOfX = Date.UTC(y, m - 1, d, 0, 0, 0);
  // Offset entre TZ y UTC en ese instante.
  const offset = tzOffsetMs(midnightUtcOfX, tz);
  // "00:00 día X en TZ local", expresado como instante UTC.
  const midnightLocalOfX = midnightUtcOfX - offset;
  return {
    desdeMs: midnightLocalOfX + (VENTANA_INICIO_HORA - 24) * 3600 * 1000, // = -2h
    hastaMs: midnightLocalOfX + VENTANA_FIN_HORA * 3600 * 1000,           // = +7h
  };
}

/**
 * Regla de confianza. Ver DECISIONS.md — combina cantidad de samples y tier.
 *
 * @param {number} nSamples
 * @param {'alta'|'media'|'baja'} tier
 * @returns {'Alta' | 'Media' | 'Baja' | 'Ninguna'}
 */
export function calcularConfianza(nSamples, tier) {
  if (nSamples === 0) return 'Ninguna';
  if (nSamples < 5) return 'Baja';
  if (nSamples < 20) return tier === 'alta' ? 'Media' : 'Baja';
  return tier === 'alta' ? 'Alta' : 'Media';
}

/**
 * Dado el conjunto de samples de un usuario (crudos) y una fechaISO, devuelve
 * el objeto FuenteReloj listo para escribir en Firestore.
 *
 * Filtra la ventana nocturna, separa SDNN/RMSSD, aplica cotas fisiológicas,
 * saca mediana de cada uno, calcula confianza y arma el shape.
 *
 * @param {Object} args
 * @param {Array<{ dataType: string, timestamp: number, value: number, unit: string, sourceDevice: string }>} args.samples
 * @param {string} args.timezone
 * @param {string} args.fechaISO
 */
export function calcularRollupNocturno({ samples, timezone, fechaISO }) {
  const { desdeMs, hastaMs } = ventanaNocturnaMs(fechaISO, timezone);

  const enVentana = samples.filter(
    (s) => Number.isFinite(s.timestamp) && s.timestamp >= desdeMs && s.timestamp < hastaMs
  );

  const dentroCota = (v) => Number.isFinite(v) && v >= HRV_MIN_MS && v <= HRV_MAX_MS;

  const rmssd = enVentana.filter((s) => s.dataType === 'hrv_rmssd' && dentroCota(s.value));
  const sdnn  = enVentana.filter((s) => s.dataType === 'hrv_sdnn'  && dentroCota(s.value));

  const rmssdMedia = mediana(rmssd.map((s) => s.value));
  const sdnnMedia  = mediana(sdnn.map((s) => s.value));

  // Dispositivo representativo: el más frecuente en la ventana.
  const conteoDisp = new Map();
  for (const s of enVentana) {
    if (!s.sourceDevice) continue;
    conteoDisp.set(s.sourceDevice, (conteoDisp.get(s.sourceDevice) ?? 0) + 1);
  }
  let dispositivo = null;
  let maxN = 0;
  for (const [dev, n] of conteoDisp) {
    if (n > maxN) { dispositivo = dev; maxN = n; }
  }

  const tier = getDeviceTier(dispositivo);
  const nSamples = rmssd.length + sdnn.length;
  const confianza = calcularConfianza(nSamples, tier);

  const disponible = rmssdMedia !== null || sdnnMedia !== null;
  const hrv_metrica_preferida = rmssdMedia !== null ? 'rmssd'
    : sdnnMedia !== null ? 'sdnn'
    : null;

  // fechaSueno = día en que empezó el sueño = fechaISO - 1 día (calendar local).
  const fechaSueno = restarDiaISO(fechaISO);

  return {
    disponible,
    dispositivo,
    hrv_rmssd_nocturno: rmssdMedia,
    hrv_sdnn_nocturno: sdnnMedia,
    hrv_metrica_preferida,
    fechaSueno: disponible ? fechaSueno : null,
    confianza,
    metodoVentana: 'franja_fija',
    ventana: { desdeHora: '22:00', hastaHora: '07:00' },
    nSamples,
  };
}

/**
 * Resta un día calendario a un ISO date. Robusto contra fin de mes.
 * @param {string} fechaISO
 */
function restarDiaISO(fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d));
  prev.setUTCDate(prev.getUTCDate() - 1);
  const yy = prev.getUTCFullYear();
  const mm = String(prev.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(prev.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Para un batch de samples entrantes, devuelve el conjunto de fechas (día X)
 * cuyos rollups PODRÍAN cambiar. Over-computes ligeramente (agrega el día
 * exacto y el siguiente) para no perder ningún caso frontera — cada recompute
 * es idempotente, así que el overhead es bajo.
 *
 * @param {Array<{ timestamp: number }>} samples
 * @param {string} timezone
 * @returns {Set<string>}
 */
export function diasAfectadosPorBatch(samples, timezone) {
  const dias = new Set();
  const DIA_MS = 24 * 3600 * 1000;
  for (const s of samples) {
    if (!Number.isFinite(s.timestamp)) continue;
    // Un sample cae en la ventana del día X sii bucketDayInTz(t + 2h) == X.
    // Sumar 2h desplaza 22:00 al 00:00 del día siguiente, alineando la
    // ventana [22:00 X-1, 07:00 X) con [00:00 X, 09:00 X) en la comparación.
    dias.add(bucketDayInTz(s.timestamp + 2 * 3600 * 1000, timezone));
    // También agregamos el día del sample (por si el shift lo cruzó de más).
    dias.add(bucketDayInTz(s.timestamp, timezone));
    // Y el día siguiente al día real (paranoia por samples cerca del borde).
    dias.add(bucketDayInTz(s.timestamp + DIA_MS, timezone));
  }
  return dias;
}
