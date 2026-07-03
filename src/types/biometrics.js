// Tipos JSDoc para mediciones biométricas (cámara + wearable + subjetivo).
// Reflejan el contrato de Firestore: usuarios/{uid}/mediciones/{fechaISO}
// y usuarios/{uid}/dispositivos/{deviceId}. Importar como:
//   /** @typedef {import('@/types/biometrics').Medicion} Medicion */
// o:
//   import './types/biometrics.js';  // solo por efecto de tipos en IDE

/**
 * @typedef {'Alta' | 'Media' | 'Baja' | 'Ninguna'} NivelConfianza
 */

/**
 * @typedef {'Baja' | 'Moderada' | 'Alta'} NivelTension
 */
/**
 * @typedef {'Poca' | 'Normal' | 'Mucha'} NivelEnergia
 */
/**
 * @typedef {'No' | 'Algo' | 'Bastante'} NivelFatiga
 */

/**
 * @typedef {'reloj' | 'camara' | 'subjetivo'} FuenteId
 */

/**
 * @typedef {'sube' | 'baja' | 'estable' | 'sin_datos'} Tendencia
 */

// ---------- Fuente: reloj (wearable, Fitbit/Oura/...) ----------
/**
 * Bloque escrito EXCLUSIVAMENTE por la Cloud Function de sync (Admin SDK).
 * El cliente no puede modificarlo (ver firestore.rules → relojIntacto).
 *
 * @typedef {Object} FuenteReloj
 * @property {boolean} disponible              — true si el sync trajo datos válidos del wearable hoy
 * @property {string | null} dispositivo       — id legible del wearable, p.ej. 'fitbit:charge6' | 'oura:ring4'
 * @property {number | null} hrv_rmssd_nocturno — RMSSD nocturno en ms (típicamente 20-100 en adultos)
 * @property {string | null} fechaSueno        — ISO date del sueño que originó la métrica (p.ej. '2026-06-15')
 * @property {NivelConfianza} confianza
 */

// ---------- Fuente: cámara (NeuroScan en navegador) ----------
/**
 * Resultado del módulo HRV por dedo + flash. Coincide con el shape de
 * neuroscan v19 computeMetrics().hrv (ver módulo externo).
 *
 * @typedef {Object} HrvCamara
 * @property {boolean} ok
 * @property {number} [bpm]
 * @property {number} [rmssd]
 * @property {number} [sdnn]
 * @property {number} [beats]
 * @property {NivelConfianza} [confidence]
 * @property {number} [beatsDetected]          — presente cuando ok=false: latidos crudos detectados
 * @property {{torch: string, avgR: number|null, ampPct: number|null}} [diag]
 */

/**
 * @typedef {Object} Oculomotor
 * @property {number} blinkRate                — parpadeos por minuto
 * @property {number} avgBlinkMs               — duración media del parpadeo (ms)
 * @property {number} baselineEAR              — Eye Aspect Ratio basal
 * @property {number} headStability            — índice de jitter cefálico (menor = más quieto)
 * @property {number} saccadeTrackError        — error medio de seguimiento del punto (escala relativa)
 */

/**
 * @typedef {Object} Plr
 * @property {boolean} ok
 * @property {number} [constriction]           — % de contracción pupilar al destello
 * @property {number} [latency]                — latencia hasta el mínimo de pupila (ms)
 */

/**
 * @typedef {Object} FuenteCamara
 * @property {boolean} disponible
 * @property {HrvCamara | null} hrv
 * @property {Oculomotor | null} oculomotor
 * @property {Plr | null} plr
 * @property {NivelConfianza} confianza_general
 */

// ---------- Fuente: subjetivo (cuestionario baseline) ----------
/**
 * @typedef {Object} FuenteSubjetivo
 * @property {NivelTension} tension
 * @property {NivelEnergia} energia
 * @property {NivelFatiga} fatiga
 */

// ---------- Resumen agregado ----------
/**
 * @typedef {Object} Resumen
 * @property {FuenteId} fuentePrincipal        — cuál fuente pesó más al armar el índice del día
 * @property {number | null} indiceCompuesto   — 0-100, score normalizado del día; null si aún no hay suficiente info para agregarlo (p.ej. medición cámara sin reloj)
 * @property {Tendencia} tendenciaSemana       — comparado contra el rolling de 7 días previo
 */

// ---------- Doc raíz ----------
/**
 * Documento en usuarios/{uid}/mediciones/{fechaISO}.
 * Doc id = fecha (string ISO, p.ej. "2026-06-16"). El campo fecha interno
 * debe coincidir con el doc id — lo enforza la rule de create.
 *
 * @typedef {Object} Medicion
 * @property {string} fecha                    — ISO date, igual al doc id
 * @property {{
 *   reloj: FuenteReloj,
 *   camara: FuenteCamara,
 *   subjetivo: FuenteSubjetivo
 * }} fuentes
 * @property {Resumen} resumen
 */

// ---------- Dispositivos wearables ----------
/**
 * Documento en usuarios/{uid}/dispositivos/{deviceId}.
 * Lo escribe SOLO la Cloud Function de OAuth/sync (Admin SDK).
 * El cliente solo lo lee para mostrar UI de conexión.
 *
 * Schema preliminar — se afinará cuando se implemente el flujo OAuth.
 *
 * @typedef {'fitbit' | 'oura' | 'apple_health' | 'google_fit'} ProveedorWearable
 */

/**
 * @typedef {Object} Dispositivo
 * @property {ProveedorWearable} proveedor
 * @property {boolean} conectado
 * @property {string | null} ultimaSincronizacion — ISO datetime de la última sync exitosa
 * @property {string | null} expiraToken          — ISO datetime de expiración del access token (info, no el token)
 * @property {string | null} scopeOtorgado        — scopes OAuth concedidos por el usuario
 */

export {};
