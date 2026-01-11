import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Button, Box } from '@mui/material';

const Navbar = ({ onLogout }) => {
  const location = useLocation();
  const prevLocationRef = useRef(null);
  const fadeInRef = useRef(null);
  const fadeOutRef = useRef(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeInVideo = fadeInRef.current;
    const fadeOutVideo = fadeOutRef.current;
    if (!fadeInVideo || !fadeOutVideo) return;

    const currentPath = location.pathname;
    const prevPath = prevLocationRef.current;

    // Solo actuar si el path cambió (o si es la primera carga en '/')
    if (currentPath === prevPath && currentPath !== '/') return;

    const handleEnd = (videoToHide) => {
      setIsFading(false);
      if (videoToHide) {
        videoToHide.style.opacity = '1';
      }
    };

    const playVideo = async (video) => {
      try {
        video.currentTime = 0;
        await video.play();
      } catch (error) {
        console.warn('Video playback failed:', error);
        setIsFading(false);
      }
    };

    // Al navegar, siempre iniciamos la animación pero NO bloqueamos
    if (currentPath === '/') {
      setIsFading(true);
      fadeInVideo.style.opacity = '1';
      // Cuando termina el FadeIn, nos aseguramos de que el otro esté oculto
      fadeInVideo.onended = () => handleEnd(fadeOutVideo);
      playVideo(fadeInVideo);
    } else if (prevPath === '/') {
      setIsFading(true);
      fadeInVideo.style.opacity = '0';
      // Cuando termina el FadeOut, lo ocultamos para que no se vea pausado
      fadeOutVideo.onended = () => handleEnd(fadeOutVideo);
      playVideo(fadeOutVideo);
    } else {
      // Si cargamos directamente una ruta que no es '/', o navegamos entre ellas
      fadeInVideo.currentTime = 0;
      fadeInVideo.style.opacity = '1';
      setIsFading(false);
    }

    prevLocationRef.current = currentPath;

    return () => {
      fadeInVideo.onended = null;
      fadeOutVideo.onended = null;
    };
  }, [location.pathname]);

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: '#CFCFCF',
        backdropFilter: 'blur(4px)',
        color: 'black',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        zIndex: 1201,
        height: '65px',
        pr: 2
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }} className='div-bienvenida'>
        <div className='animacion-container'>
          <video
            ref={fadeInRef}
            src="/FadeIn.mp4"
            className='animacion-video'
            muted
            style={{ zIndex: 2, pointerEvents: 'none', opacity: location.pathname === '/' ? 1 : 0 }}
          ></video>
          <video
            ref={fadeOutRef}
            src="/FadeOut.mp4"
            className='animacion-video'
            muted
            style={{ zIndex: 1, opacity: 0, pointerEvents: 'none' }}
          ></video>
        </div>
        <Link
          to="/"
          className="bienvenida-link"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            textTransform: 'none',
            pointerEvents: isFading ? 'none' : 'auto'
          }}
          onClick={(e) => isFading && e.preventDefault()}
        >
          BIENVENIDA
        </Link>
      </div>

      <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
        <Button
          component={Link}
          to="/ventas"
          disableRipple
          sx={{
            color: 'black',
            textTransform: 'none',
            '&:hover': { backgroundColor: 'transparent' },
            pointerEvents: isFading ? 'none' : 'auto'
          }}
        >
          Ventas
        </Button>
        <Button
          component={Link}
          to="/clientes"
          disableRipple
          sx={{
            color: 'black',
            textTransform: 'none',
            '&:hover': { backgroundColor: 'transparent' },
            pointerEvents: isFading ? 'none' : 'auto'
          }}
        >
          Clientes
        </Button>
        <Button
          component={Link}
          to="/empleados"
          disableRipple
          sx={{
            color: 'black',
            textTransform: 'none',
            '&:hover': { backgroundColor: 'transparent' },
            pointerEvents: isFading ? 'none' : 'auto'
          }}
        >
          Empleados
        </Button>
        <Button
          component={Link}
          to="/compras"
          disableRipple
          sx={{
            color: 'black',
            textTransform: 'none',
            '&:hover': { backgroundColor: 'transparent' },
            pointerEvents: isFading ? 'none' : 'auto'
          }}
        >
          Compras
        </Button>
        <Button
          component={Link}
          to="/inventario"
          disableRipple
          sx={{
            color: 'black',
            textTransform: 'none',
            '&:hover': { backgroundColor: 'transparent' },
            pointerEvents: isFading ? 'none' : 'auto'
          }}
        >
          Inventario
        </Button>
      </Box>
    </AppBar>
  );
};

export default Navbar;