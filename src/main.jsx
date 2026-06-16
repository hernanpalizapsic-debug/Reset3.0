import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: '24px',
          fontFamily: 'sans-serif', textAlign: 'center',
        }}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <h2 style={{ margin: '16px 0 8px' }}>Algo salió mal</h2>
          <p style={{ color: '#868E96', marginBottom: 24 }}>
            {this.state.error.message || 'Error inesperado'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', background: '#51CF66', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 15, cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
