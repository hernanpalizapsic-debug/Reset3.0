// Funciones puras de interpretación biométrica compartidas por el modal de
// resultado (EvaluacionResultado.jsx) y la página de historial (MiEvolucion.jsx).
//
// Cada phrase* toma la sub-parte del documento Firestore
// (usuarios/{uid}/mediciones/{fecha}) que necesita y devuelve
// `{ icon, title, text }` o null si no hay datos para interpretar.
//
// Sin JSX, sin styles, sin imports de React — para poder testear y reutilizar.
//
// Origen: portado desde neuroscanbio/src/ui.js (mismo criterio, adaptado del
// shape plano de computeMetrics() al shape anidado del doc Firestore).

/**
 * @typedef {{ icon: string, title: string, text: string }} Frase
 */

/** @param {object|null|undefined} hrv */
export function phraseHRV(hrv) {
  if (!hrv || !hrv.ok) {
    const detected = hrv?.beatsDetected;
    return {
      icon: '❤️',
      title: 'Pulso',
      text: `No pudimos medir tu pulso con suficiente claridad esta vez${
        detected != null ? ` (se detectaron ${detected} latidos posibles)` : ''
      }. Probá apoyar el dedo con más firmeza, cubriendo bien la cámara y el flash, sin moverlo.`,
    };
  }
  let text = `Tu corazón late en promedio ${hrv.bpm} veces por minuto. `;
  if (hrv.confidence === 'Alta') {
    if (hrv.rmssd > 50)
      text += 'La variación entre tus latidos es alta — un patrón típicamente asociado a un estado más relajado y con buena capacidad de recuperación.';
    else if (hrv.rmssd < 20)
      text += 'La variación entre tus latidos es baja — un patrón típicamente asociado a un estado de mayor activación o alerta.';
    else
      text += 'La variación entre tus latidos está en un rango intermedio, compatible con un estado equilibrado.';
  } else {
    text += 'La medición tiene confianza media: sirve como referencia, pero conviene repetirla para confirmar la tendencia.';
  }
  return { icon: '❤️', title: 'Pulso y ritmo cardíaco', text };
}

/** @param {object|null|undefined} oculomotor */
export function phraseBlink(oculomotor) {
  const rate = oculomotor?.blinkRate;
  if (rate == null) return null;
  let text;
  if (rate < 8)
    text = `Parpadeaste poco durante la prueba (${rate}/min). Esto puede indicar concentración intensa o fatiga ocular acumulada.`;
  else if (rate > 25)
    text = `Parpadeaste con frecuencia alta (${rate}/min), lo cual a veces se asocia a cansancio visual o irritación.`;
  else
    text = `Tu frecuencia de parpadeo (${rate}/min) está en un rango típico de alerta relajada.`;
  return { icon: '👁️', title: 'Parpadeo', text };
}

/** @param {object|null|undefined} oculomotor */
export function phraseSaccade(oculomotor) {
  const err = oculomotor?.saccadeTrackError;
  if (err == null) return null;
  let text;
  if (err < 5)
    text = 'Seguiste el punto en pantalla con buena precisión — tu coordinación visual estuvo fina durante la prueba.';
  else if (err < 12)
    text = 'Tu seguimiento visual fue aceptable, con cierta dispersión — normal si hubo distracción momentánea.';
  else
    text = 'Hubo bastante dispersión al seguir el punto, lo que puede reflejar fatiga visual o dificultad para mantener el foco en este momento.';
  return { icon: '🎯', title: 'Seguimiento visual', text };
}

/** @param {object|null|undefined} plr */
export function phrasePLR(plr) {
  if (!plr || !plr.ok) {
    return {
      icon: '💡',
      title: 'Reacción pupilar a la luz',
      text: 'No pudimos medir la reacción de tu pupila al destello con suficiente confianza esta vez (depende mucho del color de ojos y la luz ambiente). No es un problema, simplemente no se reporta un dato sin respaldo.',
    };
  }
  return {
    icon: '💡',
    title: 'Reacción pupilar a la luz',
    text: `Tu pupila se contrajo un ${plr.constriction}% al recibir el destello de luz, en ${plr.latency} milisegundos. Esta reacción refleja, hasta cierto punto, la capacidad de respuesta automática de tu sistema nervioso ante un estímulo.`,
  };
}

/** @param {object|null|undefined} oculomotor */
export function phraseHead(oculomotor) {
  const stab = oculomotor?.headStability;
  if (stab == null) return null;
  let text;
  if (stab < 1.5)
    text = 'Mantuviste la cabeza muy estable durante la prueba, señal de buen control postural en este momento.';
  else if (stab < 4)
    text = 'Tu estabilidad postural fue normal, con pequeños movimientos esperables.';
  else
    text = 'Hubo bastante movimiento de cabeza durante la prueba, lo que a veces acompaña a estados de mayor inquietud o activación.';
  return { icon: '🧍', title: 'Estabilidad postural', text };
}

/** @param {object|null|undefined} subjetivo */
export function phraseSubjetivo(subjetivo) {
  if (!subjetivo) return null;
  const t = { Baja: 'tensión baja', Moderada: 'tensión moderada', Alta: 'tensión alta' }[subjetivo.tension];
  const e = { Poca: 'poca energía', Normal: 'energía normal', Mucha: 'mucha energía' }[subjetivo.energia];
  const f = { No: 'sin fatiga ocular', Algo: 'algo de fatiga ocular', Bastante: 'bastante fatiga ocular' }[subjetivo.fatiga];
  const parts = [t, e, f].filter(Boolean);
  if (!parts.length) return null;
  return {
    icon: '💭',
    title: 'Cómo te sentiste',
    text: `Reportaste ${parts.join(', ')}.`,
  };
}

/**
 * Devuelve las tarjetas de interpretación aplicables a una medición Firestore.
 * Si fuentes.camara.disponible === false, solo devuelve la de subjetivo
 * (el resto no tiene sentido sin datos de cámara).
 *
 * @param {import('../types/biometrics').Medicion|null|undefined} medicion
 * @returns {Frase[]}
 */
export function phrasesFromMedicion(medicion) {
  const camara = medicion?.fuentes?.camara;
  const subjetivo = medicion?.fuentes?.subjetivo;
  const oculomotor = camara?.oculomotor;
  const camaraDisponible = !!camara?.disponible;

  return camaraDisponible
    ? [
        phraseHRV(camara?.hrv),
        phraseBlink(oculomotor),
        phraseSaccade(oculomotor),
        phrasePLR(camara?.plr),
        phraseHead(oculomotor),
        phraseSubjetivo(subjetivo),
      ].filter(Boolean)
    : [phraseSubjetivo(subjetivo)].filter(Boolean);
}

/** ISO "YYYY-MM-DD" → "DD/MM/YYYY". Sin timezone shenanigans. */
export function formatFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
