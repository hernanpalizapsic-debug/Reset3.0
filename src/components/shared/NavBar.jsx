import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const IconoSalir = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function NavBar() {
  const { userRole, logout } = useAuth();
  const location = useLocation();

  const navParticipante = [
    { path: '/', label: 'Inicio', icon: '🏠' },
    { path: '/flujo', label: 'Mi día', icon: '🌅' },
    { path: '/noche', label: 'Noche', icon: '🌙' },
    { path: '/audios', label: 'Audios', icon: '🎧' },
    { path: '/contenido', label: 'Contenido', icon: '📚' },
    { path: '/notas', label: 'Notas', icon: '📝' },
    { path: '/evolucion', label: 'Evolución', icon: '📈' },
  ];

  const navAdmin = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
  ];

  const nav = userRole === 'admin' ? navAdmin : navParticipante;

  return (
    <>
      {/* Header superior */}
      <header className="app-header">
        <div className="app-header-brand">
          <span className="app-header-logo">🧠</span>
          <span className="app-header-titulo">Reset 3.0</span>
        </div>
        <button className="app-header-logout" onClick={logout} title="Cerrar sesión">
          <IconoSalir />
          <span>Salir</span>
        </button>
      </header>

      {/* Barra inferior */}
      <nav className="navbar">
        {nav.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'activo' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
