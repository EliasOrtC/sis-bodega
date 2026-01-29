import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import Navbar from './components/layout/Navbar.jsx';
import FloatingMenu from './components/layout/FloatingMenu.jsx';
import { SelectionProvider, useSelection } from './context/SelectionContext.jsx';
import { UIProvider, useUI } from './context/UIContext.jsx';
import Assistant from './components/AI/Assistant.jsx';

import { socket } from './utils/socket';
import './styles/App.css';
import './styles/Modales.css';

const Login = lazy(() => import('./pages/Login.jsx'));
const Bienvenida = lazy(() => import('./pages/Bienvenida.jsx'));
const Ventas = lazy(() => import('./pages/Ventas.jsx'));
const Clientes = lazy(() => import('./pages/Clientes.jsx'));
const Empleados = lazy(() => import('./pages/Empleados.jsx'));
const Compras = lazy(() => import('./pages/Compras.jsx'));
const Inventario = lazy(() => import('./pages/Inventario.jsx'));
const Graficos = lazy(() => import('./pages/Graficos.jsx'));
const Configuracion = lazy(() => import('./pages/Configuracion.jsx'));

const theme = createTheme({
  palette: {
    mode: 'light', // Cambia a modo oscuro
    primary: { main: '#8a1010ff' }, // Rojo
    secondary: { main: '#000000ff' }, // Verde
  },
  typography: {
    fontFamily: 'Georgia, sans-serif',
  },
});


function App() {
  useEffect(() => {
    const onConnect = () => console.log('Connected to server');
    const onDisconnect = () => console.log('Disconnected from server');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SelectionProvider>
        <UIProvider>
          <Router>
            <AppContent />
          </Router>
        </UIProvider>
      </SelectionProvider>
    </ThemeProvider>

  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (user) {
      try {
        JSON.parse(user);
        return true;
      } catch {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        return false;
      }
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { setSelectedItem } = useSelection();
  const { isAssistantOpen, setAssistantOpen, toggleAssistant } = useUI();

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  const confirmLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    deleteCookie('rememberedUsername');
    // No borramos la contraseña porque ya no se guarda en cookie
    setIsAuthenticated(false);
    setShowLogoutModal(false);
    navigate('/login');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  useEffect(() => {
    if (isAuthenticated && location.pathname !== '/login') {
      sessionStorage.setItem('lastVisited', location.pathname);
    }
  }, [location.pathname, isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && location.pathname !== '/login') {
      sessionStorage.setItem('redirectAfterLogin', location.pathname);
      navigate('/login');
    }
    else if (isAuthenticated && location.pathname === '/login') {
      const lastVisited = sessionStorage.getItem('lastVisited');
      navigate(lastVisited || '/');
      sessionStorage.removeItem('lastVisited');
    }
  }, [location.pathname, navigate, isAuthenticated, isLoading]);

  useEffect(() => {
    const handleLogin = (e) => { setIsAuthenticated(true); navigate(e.detail.redirectTo); };
    const handleSessionExpired = () => {
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      setIsAuthenticated(false);
      navigate('/login');
    };

    window.addEventListener('login', handleLogin);
    window.addEventListener('sessionExpired', handleSessionExpired);

    return () => {
      window.removeEventListener('login', handleLogin);
      window.removeEventListener('sessionExpired', handleSessionExpired);
    };
  }, [navigate]);

  useEffect(() => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.token) {
          setIsAuthenticated(true);
        } else {
          // Token no válido o no existe
          setIsAuthenticated(false);
        }
      } catch {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []); // Solo al montar

  useEffect(() => {
    setSelectedItem(null);
  }, [location.pathname, setSelectedItem]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      setSelectedItem(null);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [setSelectedItem]);



  return (

    <>
      <div className="App">
        {isAuthenticated && location.pathname !== '/login' && location.pathname !== '/graficos' && <Navbar />}
        {isAuthenticated && location.pathname !== '/login' && location.pathname !== '/graficos' && (
          <FloatingMenu
            onLogout={handleLogout}
            // onToggleAssistant is now handled by FloatingMenu internal useUI hook or we pass it here?
            // To minimize changes in FloatingMenu, we can pass it, OR update FloatingMenu.
            // Let's pass it for now to keep FloatingMenu clean, or update FloatingMenu to use context?
            // The previous code passed onToggleAssistant. 
            // If we remove it from here, we MUST update FloatingMenu.
            // Let's update FloatingMenu to use useUI, BUT we can also pass it for backward compat or just simpler refactor.
            // Wait, 'FloatingMenu' handles the click.
            // Let's passed it as prop for now to avoid modifying FloatingMenu excessively if not needed, 
            // BUT I said I would update FloatingMenu. 
            // Let's just pass the context function here.
            onToggleAssistant={toggleAssistant}
          />
        )}
        <Suspense fallback={<div>Cargando...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            {isAuthenticated && (
              <>
                <Route path="/" element={<Bienvenida />} />
                <Route path="/ventas" element={<Ventas />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/empleados" element={<Empleados />} />
                <Route path="/compras" element={<Compras />} />
                <Route path="/inventario" element={<Inventario />} />
                <Route path="/graficos" element={<Graficos />} />
                <Route path="/configuracion" element={<Configuracion />} />
              </>
            )}
          </Routes>
        </Suspense>
        {isAuthenticated && location.pathname !== '/login' && (
          <Assistant
            isOpen={isAssistantOpen}
            onClose={() => setAssistantOpen(false)}
          />
        )}
        <Dialog
          open={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          PaperProps={{ className: 'custom-modal-paper' }}
          slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
          disableRestoreFocus
          disableEnforceFocus
        >
          <DialogTitle className="modal-title">Confirmar Cierre de Sesión</DialogTitle>
          <DialogContent className="modal-content-styled">
            <DialogContentText>
              ¿Estás seguro de que quieres cerrar sesión?
            </DialogContentText>
          </DialogContent>
          <DialogActions className="modal-actions-styled">
            <Button onClick={() => { setShowLogoutModal(false) }} className="modal-btn-secondary">Cancelar</Button>
            <Button onClick={confirmLogout} variant="contained" className="modal-btn-primary">Cerrar Sesión</Button>
          </DialogActions>
        </Dialog>
      </div>
    </>
  );
}

export default App;
// Force rebuild
