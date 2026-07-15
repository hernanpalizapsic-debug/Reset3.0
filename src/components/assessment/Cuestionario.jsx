// Componente genérico de cuestionario — una pregunta por pantalla,
// mobile-first, con progress bar y navegación previa/siguiente.
//
// Consume la shape de src/lib/instruments.js:
//   { key, title, instructions, items: [{ id, text, options: [{label, value}] }] }
//
// Cada ítem tiene su propia lista `options` (permite que instrumentos como
// el ISI mezclen escalas distintas por ítem — severity 1a-1c vs 0-4 en 2-5).
//
// Props:
//   instrumento: Instrument
//   onComplete(respuestas: number[]): void — largo === instrumento.items.length,
//     cada valor es el .value de la opción elegida en ese ítem.
//   subheader?: string — texto pequeño arriba (ej. "1/2")

import { useState } from 'react';

const wrap = {
  maxWidth: 480,
  margin: '0 auto',
  padding: '24px 20px',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
};
const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 12,
  color: '#868e96',
  marginBottom: 8,
};
const titleStyle = {
  margin: '4px 0 6px',
  fontSize: 16,
  fontWeight: 600,
  color: '#495057',
};
const instructionsStyle = {
  margin: '0 0 12px',
  fontSize: 13,
  color: '#495057',
  lineHeight: 1.5,
  fontStyle: 'italic',
};
const progressWrap = {
  height: 6,
  background: '#e9ecef',
  borderRadius: 3,
  overflow: 'hidden',
  marginBottom: 20,
};
const progressFill = {
  height: '100%',
  background: '#37b24d',
  transition: 'width 200ms ease',
};
const questionStyle = {
  margin: '0 0 20px',
  fontSize: 18,
  lineHeight: 1.4,
  color: '#212529',
};
const optionsWrap = { flex: 1, display: 'flex', flexDirection: 'column', gap: 8 };
const optionBase = {
  padding: '14px 16px',
  borderRadius: 10,
  fontSize: 15,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  transition: 'border-color 100ms, background 100ms',
};
const optionIdle = {
  ...optionBase,
  border: '1px solid #dee2e6',
  background: '#fff',
  color: '#495057',
};
const optionSelected = {
  ...optionBase,
  border: '2px solid #37b24d',
  background: '#ebfbee',
  color: '#212529',
  fontWeight: 500,
};
const navRow = {
  display: 'flex',
  gap: 8,
  marginTop: 20,
  paddingTop: 12,
  borderTop: '1px solid #e9ecef',
};
const btnPrimary = {
  flex: 1,
  padding: '14px 20px',
  fontSize: 15,
  fontWeight: 600,
  border: 'none',
  borderRadius: 10,
  background: '#37b24d',
  color: '#fff',
  cursor: 'pointer',
};
const btnGhost = {
  padding: '14px 20px',
  fontSize: 15,
  fontWeight: 500,
  border: '1px solid #dee2e6',
  borderRadius: 10,
  background: '#fff',
  color: '#495057',
  cursor: 'pointer',
};
const btnDisabled = { opacity: 0.5, cursor: 'not-allowed' };

/**
 * @param {{
 *   instrumento: object,
 *   onComplete: (respuestas: number[]) => void,
 *   subheader?: string,
 * }} props
 */
export default function Cuestionario({ instrumento, onComplete, subheader }) {
  const [idx, setIdx] = useState(0);
  const [respuestas, setRespuestas] = useState(() =>
    new Array(instrumento.items.length).fill(null)
  );
  const total = instrumento.items.length;
  const item = instrumento.items[idx];
  const current = respuestas[idx];
  const isLast = idx === total - 1;

  function pick(v) {
    const next = respuestas.slice();
    next[idx] = v;
    setRespuestas(next);
  }

  function goNext() {
    if (current === null) return;
    if (isLast) onComplete(respuestas);
    else setIdx(idx + 1);
  }

  function goPrev() {
    if (idx > 0) setIdx(idx - 1);
  }

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <span>{subheader || instrumento.title}</span>
        <span>
          Pregunta {idx + 1} de {total}
        </span>
      </div>
      <h2 style={titleStyle}>{instrumento.title}</h2>
      {/* Instrucciones solo en la primera pregunta — evita ruido en las siguientes. */}
      {idx === 0 && instrumento.instructions && (
        <p style={instructionsStyle}>{instrumento.instructions}</p>
      )}
      <div style={progressWrap}>
        <div style={{ ...progressFill, width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      <p style={questionStyle}>{item.text}</p>

      <div style={optionsWrap}>
        {item.options.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => pick(value)}
            style={current === value ? optionSelected : optionIdle}
            aria-pressed={current === value}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={navRow}>
        {idx > 0 && (
          <button style={btnGhost} onClick={goPrev}>
            ← Anterior
          </button>
        )}
        <button
          style={{ ...btnPrimary, ...(current === null ? btnDisabled : {}) }}
          onClick={goNext}
          disabled={current === null}
        >
          {isLast ? 'Terminar' : 'Siguiente →'}
        </button>
      </div>
    </div>
  );
}
