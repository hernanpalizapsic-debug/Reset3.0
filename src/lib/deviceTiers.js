// Mapeo dispositivo → tier de precisión para el cálculo de confianza HRV.
// Tier "alta": wearables con óptica multi-LED y algoritmos maduros de HRV.
// Tier "media": wearables con hardware decente pero HRV menos validado.
// Fallback "media" para dispositivos desconocidos — optimismo prudente.
//
// La comparación es por prefijo case-insensitive contra el sourceDevice slug.
// Agregar dispositivos nuevos acá sin tocar el core del rollup.

/**
 * @typedef {'alta' | 'media' | 'baja'} DeviceTier
 */

const PREFIX_TIERS = [
  { prefix: 'apple_watch:',       tier: 'alta' },
  { prefix: 'apple-watch:',       tier: 'alta' },
  { prefix: 'oura:',              tier: 'alta' },
  { prefix: 'whoop:',             tier: 'alta' },
  { prefix: 'garmin:premium:',    tier: 'alta' },
  { prefix: 'fitbit:',            tier: 'media' },
  { prefix: 'google_pixelwatch:', tier: 'media' },
  { prefix: 'pixelwatch:',        tier: 'media' },
  { prefix: 'garmin:',            tier: 'media' },
];

/**
 * Devuelve el tier del dispositivo. Fallback 'media' si no matchea.
 *
 * @param {string | null | undefined} sourceDevice
 * @returns {DeviceTier}
 */
export function getDeviceTier(sourceDevice) {
  if (typeof sourceDevice !== 'string' || !sourceDevice.length) return 'media';
  const s = sourceDevice.toLowerCase();
  for (const { prefix, tier } of PREFIX_TIERS) {
    if (s.startsWith(prefix)) return tier;
  }
  return 'media';
}
