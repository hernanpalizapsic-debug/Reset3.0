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
 * @typedef {'rmssd' | 'sdnn'} HrvMetrica
 */

/**
 * @typedef {'franja_fija' | 'sueno_detectado'} MetodoVentanaNocturna
 */

/**
 * Bloque escrito EXCLUSIVAMENTE por el rollup server-side (Admin SDK).
 * El cliente no puede modificarlo (ver firestore.rules → relojIntacto).
 *
 * SDNN y RMSSD son métricas HRV DISTINTAS y NO intercambiables (rangos y
 * significado fisiológico distintos). Se guardan en campos separados. El
 * campo hrv_metrica_preferida indica cuál usar como headline en el UI cuando
 * hay ambas — pero cualquier agregado semanal/mensual debe hacerse por
 * métrica separada, nunca mezclando SDNN y RMSSD.
 *
 * @typedef {Object} FuenteReloj
 * @property {boolean} disponible                        — true si el rollup encontró samples válidos en la ventana
 * @property {string | null} dispositivo                 — id legible del wearable, p.ej. 'fitbit:charge6' | 'oura:ring4'
 * @property {number | null} hrv_rmssd_nocturno          — RMSSD nocturno en ms (típicamente 20-100 en adultos)
 * @property {number | null} hrv_sdnn_nocturno           — SDNN nocturno en ms (típicamente 50-200 en adultos)
 * @property {HrvMetrica | null} hrv_metrica_preferida   — cuál mostrar como headline si hay ambas
 * @property {string | null} fechaSueno                  — ISO date del inicio del sueño (día anterior al doc en ventana fija)
 * @property {NivelConfianza} confianza                  — derivada de nSamples + tier del dispositivo
 * @property {MetodoVentanaNocturna} [metodoVentana]     — 'franja_fija' (fase 1) o 'sueno_detectado' (fase 2)
 * @property {{ desdeHora: string, hastaHora: string }} [ventana] — bordes de la franja, ej. '22:00'/'07:00'
 * @property {number} [nSamples]                         — cantidad de muestras HRV usadas para el promedio
 */

// ---------- Fuente: cámara (NeuroScan en navegador) ----------
/**
 * Resultado de pulso derivado de cámara.
 * Fuentes posibles: rPPG (POS + FFT + SNR, la actual "canónica") o dedo
 * con flash trasero (legacy — se conserva en FuenteCamara.hrv_dedo).
 * El shape es el mismo para ambas para poder mostrarlas indistintamente.
 *
 * @typedef {Object} HrvCamara
 * @property {boolean} ok
 * @property {number} [bpm]
 * @property {number} [rmssd]
 * @property {number} [sdnn]
 * @property {number} [beats]
 * @property {NivelConfianza} [confidence]        — confianza global (para HR)
 * @property {NivelConfianza} [rmssd_confidence]  — presente en rPPG: siempre ≤ confidence
 * @property {number} [snr]                       — SNR espectral en dB (solo rPPG)
 * @property {number} [beatsDetected]             — presente cuando ok=false (dedo)
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
 * @property {HrvCamara | null} hrv               — pulso rPPG (POS + FFT) — fuente canónica de la cámara
 * @property {HrvCamara | null} [hrv_dedo]        — pulso por dedo con flash trasero (legacy/opcional)
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
 * Tipo de evaluación biométrica que generó este documento. Presente cuando
 * la medición vino vía el bridge desde Reset 3.0. Ausente si el doc se creó
 * por otra vía (import manual, migración, etc.).
 *
 * @typedef {'inicial' | 'semanal' | 'cierre' | 'final'} TipoEvaluacion
 */

/**
 * Documento en usuarios/{uid}/mediciones/{fechaISO}.
 * Doc id = fecha (string ISO, p.ej. "2026-06-16"). El campo fecha interno
 * debe coincidir con el doc id — lo enforza la rule de create.
 *
 * @typedef {Object} Medicion
 * @property {string} fecha                    — ISO date, igual al doc id
 * @property {TipoEvaluacion} [tipo]           — qué evaluación disparó Reset 3.0 (opcional; escrito por neuroscanbio/src/metrics-sink.js)
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
