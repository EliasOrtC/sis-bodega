import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import Navbar from './components/Navbar.jsx';
import FloatingMenu from './components/FloatingMenu.jsx';
import { SelectionProvider, useSelection } from './CSS/SelectionContext.jsx';
import ClickSpark from './CSS/ClickSpark.jsx';
import { socket } from './socket';
import './CSS/App.css';
import './CSS/Modales.css';

const Login = lazy(() => import('./components/Login.jsx'));
const Bienvenida = lazy(() => import('./components/Bienvenida.jsx'));
const Ventas = lazy(() => import('./components/Ventas.jsx'));
const Clientes = lazy(() => import('./components/Clientes.jsx'));
const Empleados = lazy(() => import('./components/Empleados.jsx'));
const Compras = lazy(() => import('./components/Compras.jsx'));
const Inventario = lazy(() => import('./components/Inventario.jsx'));
const Graficos = lazy(() => import('./components/Graficos.jsx'));

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
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // No desconectar el socket aquí, ya que es global y debe persistir
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SelectionProvider>
        <Router>
          <AppContent />
        </Router>
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
    deleteCookie('rememberedPassword');
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
    window.addEventListener('login', handleLogin);
    return () => window.removeEventListener('login', handleLogin);
  }, [navigate]);

  useEffect(() => {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (user) {
      try {
        JSON.parse(user);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      } catch {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
      }
    }
    const rememberedUsername = getCookie('rememberedUsername');
    const rememberedPassword = getCookie('rememberedPassword');
    if (rememberedUsername && rememberedPassword) {
      // Intentar login automático
      fetch('http://192.168.1.235:5001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: rememberedUsername, password: rememberedPassword }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setIsAuthenticated(true);
          } else {
            // Falló, borrar cookies
            deleteCookie('rememberedUsername');
            deleteCookie('rememberedPassword');
          }
          setIsLoading(false);
        })
        .catch(() => {
          deleteCookie('rememberedUsername');
          deleteCookie('rememberedPassword');
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
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

    <ClickSpark>
      <div className="App">
        {isAuthenticated && location.pathname !== '/login' && location.pathname !== '/graficos' && <Navbar />}
        {isAuthenticated && location.pathname !== '/login' && location.pathname !== '/graficos' && <FloatingMenu onLogout={handleLogout} />}
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
              </>
            )}
          </Routes>
        </Suspense>
        <Dialog
          open={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          PaperProps={{ className: 'custom-modal-paper' }}
          slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
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
    </ClickSpark>
  );
}

export default App;
