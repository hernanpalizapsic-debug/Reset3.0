import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function VerificarEmail() {
  const { currentUser, resendVerificationEmail, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [chequeando, setChequeando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function handleReenviar() {
    setError('');
    setMensaje('');
    setEnviando(true);
    try {
      await resendVerificationEmail();
      setMensaje('Correo reenviado. Revisá tu bandeja de entrada y la carpeta de spam.');
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        setError('Ya enviamos varios correos. Esperá unos minutos antes de reintentar.');
      } else {
        setError('No pudimos reenviar el correo. Intentá de nuevo en un momento.');
      }
    }
    setEnviando(false);
  }

  async function handleYaVerifique() {
    setError('');
    setMensaje('');
    setChequeando(true);
    try {
      const verified = await refreshUser();
      if (verified) {
        navigate('/', { replace: true });
      } else {
        setError('Todavía no vemos tu email como verificado. Revisá el correo y hacé click en el link.');
      }
    } catch {
      setError('No pudimos verificar el estado. Intentá de nuevo.');
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
          <span className="logo-icon">📧</span>
          <h1>Verificá tu email</h1>
          <p>Un último paso para activar tu cuenta.</p>
        </div>

        <div className="auth-form">
          <p style={{ marginBottom: '1rem' }}>
            Enviamos un correo a <strong>{currentUser?.email}</strong> con un link
            de verificación. Hacé click en el link para continuar.
          </p>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
            Si no lo ves, revisá la carpeta de spam o promociones.
          </p>

          {mensaje && <div className="alert alert-success">{mensaje}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={handleYaVerifique}
            disabled={chequeando}
            style={{ marginBottom: '0.75rem' }}
          >
            {chequeando ? 'Verificando...' : 'Ya verifiqué, continuar'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={handleReenviar}
            disabled={enviando}
            style={{ marginBottom: '0.75rem' }}
          >
            {enviando ? 'Enviando...' : 'Reenviar correo'}
          </button>

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
