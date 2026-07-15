// instruments.js
// Definición de los instrumentos del piloto RESET Ejecutivo.
// Cada instrumento es data: el componente de pantalla lo renderiza igual.
//
// Forma de cada instrumento:
//   { key, title, instructions, items: [{ id, text, options: [{label, value}] }] }
// El array de respuestas que se manda a scoring.js sigue el ORDEN de `items`.

// ---------------------------------------------------------------------------
// PSS-10 — Escala de Estrés Percibido (Cohen et al., 1983; versión española
// Remor, 2006). INSTRUMENTO DE USO LIBRE — se reproduce completo.
// Respuestas 0–4. El reverse-coding de los ítems 4, 5, 7 y 8 lo hace scoring.js,
// NO acá: acá siempre se guarda el valor crudo que tocó el usuario.
// Verificá los enunciados contra Remor (2006) antes de producción.
// ---------------------------------------------------------------------------
const PSS10_OPTIONS = [
  { label: "Nunca", value: 0 },
  { label: "Casi nunca", value: 1 },
  { label: "De vez en cuando", value: 2 },
  { label: "A menudo", value: 3 },
  { label: "Muy a menudo", value: 4 },
];

export const PSS10 = {
  key: "pss10",
  title: "Estrés percibido",
  instructions:
    "Las siguientes preguntas se refieren a cómo te sentiste durante el último mes. En cada una, indicá con qué frecuencia te sentiste o pensaste de esa manera.",
  items: [
    { id: "pss1", text: "En el último mes, ¿con qué frecuencia te afectó algo que ocurrió de forma inesperada?", options: PSS10_OPTIONS },
    { id: "pss2", text: "En el último mes, ¿con qué frecuencia sentiste que no podías controlar las cosas importantes de tu vida?", options: PSS10_OPTIONS },
    { id: "pss3", text: "En el último mes, ¿con qué frecuencia te sentiste nervioso/a o estresado/a?", options: PSS10_OPTIONS },
    // Ítem 4 — invertido en scoring
    { id: "pss4", text: "En el último mes, ¿con qué frecuencia te sentiste seguro/a de tu capacidad para manejar tus problemas personales?", options: PSS10_OPTIONS },
    // Ítem 5 — invertido en scoring
    { id: "pss5", text: "En el último mes, ¿con qué frecuencia sentiste que las cosas te iban bien?", options: PSS10_OPTIONS },
    { id: "pss6", text: "En el último mes, ¿con qué frecuencia sentiste que no podías afrontar todo lo que tenías que hacer?", options: PSS10_OPTIONS },
    // Ítem 7 — invertido en scoring
    { id: "pss7", text: "En el último mes, ¿con qué frecuencia pudiste controlar las dificultades o irritaciones de tu vida?", options: PSS10_OPTIONS },
    // Ítem 8 — invertido en scoring
    { id: "pss8", text: "En el último mes, ¿con qué frecuencia sentiste que tenías todo bajo control?", options: PSS10_OPTIONS },
    { id: "pss9", text: "En el último mes, ¿con qué frecuencia te enojaste por cosas que estaban fuera de tu control?", options: PSS10_OPTIONS },
    { id: "pss10", text: "En el último mes, ¿con qué frecuencia sentiste que las dificultades se acumulaban tanto que no podías superarlas?", options: PSS10_OPTIONS },
  ],
};

// ---------------------------------------------------------------------------
// Claridad Decisional — escala propia (borrador). Respuestas 1–5.
// Es tuya: editá los enunciados con criterio clínico cuando quieras.
// ---------------------------------------------------------------------------
const CLARIDAD_OPTIONS = [
  { label: "Nunca", value: 1 },
  { label: "Casi nunca", value: 2 },
  { label: "A veces", value: 3 },
  { label: "Casi siempre", value: 4 },
  { label: "Siempre", value: 5 },
];

export const CLARIDAD = {
  key: "claridad",
  title: "Claridad decisional",
  instructions:
    "Pensá en tu última semana de trabajo. Indicá con qué frecuencia se dio cada situación.",
  items: [
    { id: "cd1", text: "Tomé decisiones importantes con claridad, sin quedar atrapado/a en la duda.", options: CLARIDAD_OPTIONS },
    { id: "cd2", text: "Bajo presión o urgencia, pude pensar con orden en lugar de reaccionar.", options: CLARIDAD_OPTIONS },
    { id: "cd3", text: "Terminé la jornada con capacidad mental disponible, no completamente agotado/a.", options: CLARIDAD_OPTIONS },
    { id: "cd4", text: "Sentí que mi estado interno acompañaba mis decisiones en vez de estorbarlas.", options: CLARIDAD_OPTIONS },
  ],
};

// ---------------------------------------------------------------------------
// ISI — Insomnia Severity Index (Morin, 1993).
//
// El equipo de Reset 3.0 usa una versión considerada de dominio público /
// libre uso para este piloto B2B. Fuente/referencia bibliográfica de la
// traducción usada: TODO — completar con la citación exacta cuando esté
// verificada (ej. Sierra et al. 2008; Fernández-Mendoza et al. 2012; o la
// fuente CC/dominio público empleada).
//
// Estructura del instrumento:
//   7 ítems, cada uno 0–4. Escala varía por ítem.
//   - 1a: gravedad de dificultad para CONCILIAR el sueño
//   - 1b: gravedad de dificultad para MANTENER el sueño
//   - 1c: gravedad del problema de DESPERTAR MUY TEMPRANO
//   - 2 : satisfacción/insatisfacción con el patrón de sueño actual
//   - 3 : interferencia del problema en el funcionamiento diurno
//   - 4 : cuán evidente es el problema para los demás
//   - 5 : nivel de preocupación/malestar por el problema de sueño
//
// El scoring (suma 0–28 y bandas) vive en scoring.js.
// ---------------------------------------------------------------------------
const ISI_SEVERITY = [ // ítems 1a–1c
  { label: "Ninguna", value: 0 },
  { label: "Leve", value: 1 },
  { label: "Moderada", value: 2 },
  { label: "Grave", value: 3 },
  { label: "Muy grave", value: 4 },
];
const ISI_SATISFACCION = [ // ítem 2
  { label: "Muy satisfecho/a", value: 0 },
  { label: "Satisfecho/a", value: 1 },
  { label: "Neutral", value: 2 },
  { label: "Insatisfecho/a", value: 3 },
  { label: "Muy insatisfecho/a", value: 4 },
];
const ISI_INTERFERENCIA = [ // ítems 3, 4, 5
  { label: "Nada", value: 0 },
  { label: "Un poco", value: 1 },
  { label: "Algo", value: 2 },
  { label: "Mucho", value: 3 },
  { label: "Muchísimo", value: 4 },
];

export const ISI = {
  key: "isi",
  title: "Calidad del sueño",
  instructions: "Por favor, indica la gravedad de tus problemas de sueño ACTUALES.",
  licensed: true,
  items: [
    { id: "isi1a", text: "Dificultad para quedarte dormido/a", options: ISI_SEVERITY },
    { id: "isi1b", text: "Dificultad para mantener el sueño", options: ISI_SEVERITY },
    { id: "isi1c", text: "Problema de despertarte demasiado pronto", options: ISI_SEVERITY },
    { id: "isi2", text: "¿Hasta qué punto estás SATISFECHO/A con tu sueño actual?", options: ISI_SATISFACCION },
    { id: "isi3", text: "¿En qué medida consideras que tu problema de sueño INTERFIERE con tu funcionamiento diario (fatiga, concentración, memoria, humor, rendimiento...)?", options: ISI_INTERFERENCIA },
    { id: "isi4", text: "¿En qué medida crees que tu problema de sueño es VISIBLE PARA LOS DEMÁS en términos de deterioro de tu calidad de vida?", options: ISI_INTERFERENCIA },
    { id: "isi5", text: "¿Hasta qué punto estás PREOCUPADO/A por tu problema de sueño actual?", options: ISI_INTERFERENCIA },
  ],
};

// Orden de administración del assessment
export const ASSESSMENT_INSTRUMENTS = [PSS10, ISI, CLARIDAD];
