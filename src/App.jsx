import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NavBar from './components/shared/NavBar';
import EvaluacionResultado from './components/shared/EvaluacionResultado';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Inicio from './pages/participant/Inicio';
import FlujoDiario from './pages/participant/FlujoDiario';
import MomentoNoche from './pages/participant/MomentoNoche';
import Notas from './pages/participant/Notas';
import Contenido from './pages/participant/Contenido';
import Audios from './pages/participant/Audios';
import MiEvolucion from './pages/participant/MiEvolucion';
import Dashboard from './pages/admin/Dashboard';
import AdminMediciones from './pages/admin/AdminMediciones';
import './index.css';

function RutaProtegida({ children, rolRequerido }) {
  const { currentUser, userRole } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (rolRequerido && userRole !== rolRequerido) return <Navigate to="/" />;
  return children;
}

function RutaRaiz() {
  const { userRole } = useAuth();
  if (userRole === 'admin') return <Navigate to="/admin" replace />;
  return <Inicio />;
}

function AppRutas() {
  const { currentUser } = useAuth();

  return (
    <>
      {currentUser && <NavBar />}
      {currentUser && <EvaluacionResultado />}
      <main className={currentUser ? 'with-nav' : ''}>
        <Routes>
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
          <Route path="/registro" element={!currentUser ? <Registro /> : <Navigate to="/" />} />
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
