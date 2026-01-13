import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Button, Box, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import '../../styles/Navbar.css';

const Navbar = ({ onLogout }) => {
  const location = useLocation();
  const prevLocationRef = useRef(null);
  const fadeInRef = useRef(null);
  const fadeOutRef = useRef(null);
  const [isFading, setIsFading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false); // Cerrar menu al navegar
    const fadeInVideo = fadeInRef.current;
    const fadeOutVideo = fadeOutRef.current;
    if (!fadeInVideo || !fadeOutVideo) return;

    const currentPath = location.pathname;
    const prevPath = prevLocationRef.current;

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

    if (currentPath === '/') {
      setIsFading(true);
      fadeInVideo.style.opacity = '1';
      fadeInVideo.onended = () => handleEnd(fadeOutVideo);
      playVideo(fadeInVideo);
    } else if (prevPath === '/') {
      setIsFading(true);
      fadeInVideo.style.opacity = '0';
      fadeOutVideo.onended = () => handleEnd(fadeOutVideo);
      playVideo(fadeOutVideo);
    } else {
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

  const navLinks = [
    { to: "/ventas", label: "Ventas" },
    { to: "/clientes", label: "Clientes" },
    { to: "/empleados", label: "Empleados" },
    { to: "/compras", label: "Compras" },
    { to: "/inventario", label: "Inventario" },
  ];

  return (
    <>
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
          zIndex: 1201, // Por encima del panel movil
          height: '65px',
          pr: 2,
          boxShadow: isMenuOpen ? 'none' : '0px 2px 4px -1px rgba(0,0,0,0.2)'
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
            onClick={(e) => {
              if (isFading) e.preventDefault();
              setIsMenuOpen(false);
            }}
          >
            BIENVENIDA
          </Link>
        </div>

        <Box sx={{ display: 'flex', gap: 1, ml: 'auto', alignItems: 'center' }}>
          <Box className="nav-buttons-desktop" sx={{ display: 'flex', gap: 1 }}>
            {navLinks.map((link) => (
              <Button
                key={link.to}
                component={Link}
                to={link.to}
                disableRipple
                sx={{
                  color: 'black',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: 'transparent', transform: 'scale(1.05)' },
                  transition: 'transform 0.2s',
                  pointerEvents: isFading ? 'none' : 'auto',
                  fontWeight: location.pathname === link.to ? 700 : 400
                }}
              >
                {link.label}
              </Button>
            ))}
          </Box>

          <IconButton
            className="hamburger-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            sx={{ ml: 1 }}
          >
            {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        </Box>
      </AppBar>

      {/* PANEL MOVIL */}
      <div className={`mobile-menu-panel ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          {navLinks.map((link) => (
            <Button
              key={link.to}
              component={Link}
              to={link.to}
              onClick={() => setIsMenuOpen(false)}
              sx={{
                color: 'black',
                textTransform: 'none',
                fontSize: '0.9rem',
                minWidth: 'fit-content',
                fontWeight: location.pathname === link.to ? 700 : 500,
                backgroundColor: location.pathname === link.to ? 'rgba(0,0,0,0.05)' : 'transparent',
                borderRadius: '10px',
                px: 2
              }}
            >
              {link.label}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;