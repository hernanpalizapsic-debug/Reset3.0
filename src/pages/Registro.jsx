import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function calcularFortaleza(pass) {
  if (!pass) return 0;
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  if (pass.length < 8) return Math.min(score, 1);
  return score;
}

const fortalezaConfig = [
  null,
  { label: 'Débil', color: '#FF6B6B', ancho: '25%' },
  { label: 'Regular', color: '#FFD43B', ancho: '50%' },
  { label: 'Buena', color: '#74c0fc', ancho: '75%' },
  { label: 'Segura', color: '#51CF66', ancho: '100%' },
];

function validarPassword(pass) {
  const errores = [];
  if (pass.length < 8) errores.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(pass)) errores.push('Al menos una mayúscula');
  if (!/[0-9]/.test(pass)) errores.push('Al menos un número');
  if (!/[^A-Za-z0-9]/.test(pass)) errores.push('Al menos un símbolo (!@#$%...)');
  return errores;
}

export default function Registro() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fortaleza = calcularFortaleza(password);
  const fortalezaInfo = fortalezaConfig[fortaleza];
  const erroresPass = password ? validarPassword(password) : [];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errores = validarPassword(password);
    if (errores.length > 0) {
      return setError(`La contraseña no es válida: ${errores[0].toLowerCase()}.`);
    }
    setLoading(true);
    try {
      await register(email, password, nombre.trim(), apellido.trim());
      // Fire and forget welcome email
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'bienvenida',
          email,
          nombre: nombre.trim(),
          apellido: apellido.trim(),
        }),
      }).catch(() => {});
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email ya está registrado.');
      } else {
        setError('Error al crear la cuenta. Intentá de nuevo.');
      }
    }
    setLoading(false);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🧠</span>
          <h1>Reset 3.0</h1>
          <p>Regulación del Sistema Nervioso</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Crear cuenta</h2>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-row-2">
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Nombre"
              />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
                placeholder="Apellido"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Mínimo 8 caracteres"
            />
            {password && (
              <div className="pass-strength">
                <div className="pass-strength-barra">
                  <div
                    className="pass-strength-fill"
                    style={{
                      width: fortalezaInfo?.ancho,
                      background: fortalezaInfo?.color,
                    }}
                  />
                </div>
                <span
                  className="pass-strength-label"
                  style={{ color: fortalezaInfo?.color }}
                >
                  {fortalezaInfo?.label}
                </span>
              </div>
            )}
            {erroresPass.length > 0 && (
              <ul className="pass-requisitos">
                {erroresPass.map((e) => (
                  <li key={e}>✗ {e}</li>
                ))}
              </ul>
            )}
            {password && erroresPass.length === 0 && (
              <p className="pass-ok">✓ Contraseña válida</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || erroresPass.length > 0}
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>
        <p className="auth-link">
          ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
