// Pantalla de agradecimiento post-envío exitoso.
// Fase 2 puede agregar link a /assessment/:token/resultados.

export default function Gracias({ empresa }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h1 style={{ margin: '0 0 12px', color: '#37b24d', fontSize: 24 }}>
        ¡Gracias por completar el assessment!
      </h1>
      <p
        style={{
          maxWidth: 420,
          color: '#495057',
          lineHeight: 1.6,
          fontSize: 15,
          margin: 0,
        }}
      >
        Tus respuestas se registraron correctamente
        {empresa ? <> para <b>{empresa}</b></> : null}. El equipo revisará los
        resultados y te contactará con el siguiente paso.
      </p>
    </div>
  );
}
