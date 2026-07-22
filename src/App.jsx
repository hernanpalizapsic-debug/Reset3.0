import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NavBar from './components/shared/NavBar';
import EvaluacionResultado from './components/shared/EvaluacionResultado';
import Login from './pages/Login';
import Registro from './pages/Registro';
import VerificarEmail from './pages/VerificarEmail';
import CuentaEnRevision from './pages/CuentaEnRevision';
import Inicio from './pages/participant/Inicio';
import FlujoDiario from './pages/participant/FlujoDiario';
import MomentoNoche from './pages/participant/MomentoNoche';
import Notas from './pages/participant/Notas';
import Contenido from './pages/participant/Contenido';
import Audios from './pages/participant/Audios';
import MiEvolucion from './pages/participant/MiEvolucion';
import Dashboard from './pages/admin/Dashboard';
import AdminMediciones from './pages/admin/AdminMediciones';
import PublicAssessment from './pages/assessment/PublicAssessment';
import './index.css';

function RutaProtegida({ children, rolRequerido }) {
  const { currentUser, userRole, emailVerified, aprobado } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  const esAdmin = userRole === 'admin';
  // Orden del gate: verificado → aprobado → acceso. Admin bypassea ambos.
  if (!emailVerified && !esAdmin) return <Navigate to="/verificar-email" replace />;
  if (!aprobado && !esAdmin) return <Navigate to="/cuenta-en-revision" replace />;
  if (rolRequerido && userRole !== rolRequerido) return <Navigate to="/" />;
  return children;
}

function RutaRaiz() {
  const { userRole } = useAuth();
  if (userRole === 'admin') return <Navigate to="/admin" replace />;
  return <Inicio />;
}

function AppRutas() {
  const { currentUser, emailVerified, userRole, aprobado } = useAuth();
  const location = useLocation();
  // El assessment público (/assessment/:token) es standalone: no NavBar
  // ni modal EvaluacionResultado, aunque el visitante tenga cachedo un
  // login previo. El ejecutivo B2B no forma parte del programa Reset.
  const isPublicAssessment = location.pathname.startsWith('/assessment/');
  const isGateRoute = location.pathname === '/verificar-email' || location.pathname === '/cuenta-en-revision';
  const esAdmin = userRole === 'admin';
  // Chrome solo cuando el usuario tiene acceso pleno (verificado + aprobado, o admin).
  const showChrome = currentUser && !isPublicAssessment && !isGateRoute && ((emailVerified && aprobado) || esAdmin);

  return (
    <>
      {showChrome && <NavBar />}
      {showChrome && <EvaluacionResultado />}
      <main className={showChrome ? 'with-nav' : ''}>
        <Routes>
          {/* PÚBLICA — sin RutaProtegida. El token en URL es la credencial. */}
          <Route path="/assessment/:token" element={<PublicAssessment />} />

          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
          <Route path="/registro" element={!currentUser ? <Registro /> : <Navigate to="/" />} />
          <Route
            path="/verificar-email"
            element={
              !currentUser
                ? <Navigate to="/login" replace />
                : (emailVerified || esAdmin)
                  ? <Navigate to="/" replace />
                  : <VerificarEmail />
            }
          />
          <Route
            path="/cuenta-en-revision"
            element={
              !currentUser
                ? <Navigate to="/login" replace />
                : !emailVerified && !esAdmin
                  ? <Navigate to="/verificar-email" replace />
                  : (aprobado || esAdmin)
                    ? <Navigate to="/" replace />
                    : <CuentaEnRevision />
            }
          />
          <Route path="/" element={<RutaProtegida><RutaRaiz /></RutaProtegida>} />
          <Route path="/flujo" element={<RutaProtegida><FlujoDiario /></RutaProtegida>} />
          <Route path="/noche" element={<RutaProtegida><MomentoNoche /></RutaProtegida>} />
          <Route path="/notas" element={<RutaProtegida><Notas /></RutaProtegida>} />
          <Route path="/contenido" element={<RutaProtegida><Contenido /></RutaProtegida>} />
          <Route path="/audios" element={<RutaProtegida><Audios /></RutaProtegida>} />
          <Route path="/evolucion" element={<RutaProtegida><MiEvolucion /></RutaProtegida>} />
          <Route path="/admin" element={<RutaProtegida rolRequerido="admin"><Dashboard /></RutaProtegida>} />
          <Route path="/admin/mediciones" element={<RutaProtegida rolRequerido="admin"><AdminMediciones /></RutaProtegida>} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRutas />
      </AuthProvider>
    </BrowserRouter>
  );
}
