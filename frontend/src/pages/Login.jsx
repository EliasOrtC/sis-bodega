import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  Checkbox,
  FormControlLabel,
  Paper,
  Fade,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, PersonOutline } from '@mui/icons-material';
import '../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Asegurar que los campos estén vacíos al cargar (evitar pre-relleno automático del navegador)
    // Usamos un pequeño delay porque algunos navegadores rellenan justo después de montar
    const timer = setTimeout(() => {
      setUsername('');
      setPassword('');
      setShowContent(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const setCookie = (name, value, days) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://192.168.1.100:5001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        if (rememberMe) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setCookie('rememberedUsername', username, 30);
          setCookie('rememberedPassword', password, 30);
        } else {
          sessionStorage.setItem('user', JSON.stringify(data.user));
        }
        const redirectTo = sessionStorage.getItem('redirectAfterLogin') || '/';
        window.dispatchEvent(new CustomEvent('login', { detail: { redirectTo } }));
        sessionStorage.removeItem('redirectAfterLogin');
      } else {
        setError(data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-container">
      <Paper className="login-card" elevation={0}>
        <Fade in={showContent} timeout={1000}>
          <Box>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: 'rgba(138, 16, 16, 0.2)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  border: '1px solid rgba(138, 16, 16, 0.3)'
                }}
              >
                <LockOutlined sx={{ color: '#8a1010', fontSize: 32 }} />
              </Box>
              <Typography variant="h4" className="login-title">
                Bienvenido
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: -2 }}>
                Ingresa tus credenciales para continuar
              </Typography>
            </Box>

            {error && (
              <Fade in={!!error}>
                <Alert severity="error" className="login-error-alert" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              </Fade>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                name="username"
                id="username"
                label="Usuario"
                variant="outlined"
                className="login-form-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                spellCheck={false}
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutline className="login-icon-adornment" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                name="password"
                id="password"
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                className="login-form-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                spellCheck={false}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined className="login-icon-adornment" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                        className="login-icon-adornment"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                  }
                  label="Recuérdame"
                  className="login-remember-me"
                  sx={{ m: 0 }}
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                className="login-submit-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar Sesión'}
              </Button>
            </form>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                &copy; {new Date().getFullYear()} Sistema de Inventario. Todos los derechos reservados.
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Paper>
    </Box>
  );
};

export default Login;
