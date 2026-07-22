import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function CuentaEnRevision() {
  const { currentUser, estadoAprobacion, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [chequeando, setChequeando] = useState(false);
  const [error, setError] = useState('');

  const rechazado = estadoAprobacion === 'rechazado';

  async function handleRevisar() {
    setError('');
    setChequeando(true);
    try {
      const { aprobado } = await refreshUser();
      if (aprobado) {
        navigate('/', { replace: true });
      } else {
        setError(rechazado
          ? 'Tu cuenta figura como rechazada. Contactá al administrador.'
          : 'Todavía no fue aprobada. Volvé a intentar en un rato.');
      }
    } catch {
      setError('No pudimos consultar el estado. Intentá de nuevo.');
    }
    setChequeando(false);
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">{rechazado ? '⛔' : '⏳'}</span>
          <h1>{rechazado ? 'Cuenta no aprobada' : 'Tu cuenta está en revisión'}</h1>
          <p>{rechazado ? 'Contactanos para más información.' : 'Estamos revisando tu solicitud.'}</p>
        </div>

        <div className="auth-form">
          <p style={{ marginBottom: '1rem' }}>
            Registrado con <strong>{currentUser?.email}</strong>.
          </p>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
            {rechazado
              ? 'Tu solicitud fue revisada y no aprobada. Si creés que se trata de un error, contactá al administrador del programa.'
              : 'Vas a poder acceder cuando el administrador apruebe tu cuenta. Te avisaremos por email si corresponde.'}
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          {!rechazado && (
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={handleRevisar}
              disabled={chequeando}
              style={{ marginBottom: '0.75rem' }}
            >
              {chequeando ? 'Verificando...' : 'Ver si ya me aprobaron'}
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--texto)',
              opacity: 0.75,
              cursor: 'pointer',
              padding: '8px',
              fontSize: '14px',
              textDecoration: 'underline',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
