import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Button, TextField, Box } from '@mui/material';

const Navbar = ({ onLogout }) => {
  const location = useLocation();
  const lastVisited = sessionStorage.getItem('lastVisited');
  const fadeInRef = useRef(null);
  const fadeOutRef = useRef(null);
  const [isFading, setIsFading] = useState(false);
  const imgClass = location.pathname === "/" ? "animacion-img fade-in" : "animacion-img fade-out";

  useEffect(() => {
    const fadeInVideo = fadeInRef.current;
    const fadeOutVideo = fadeOutRef.current;
    if (!fadeInVideo || !fadeOutVideo) return;


    const playVideo = async (video) => {
      try {
        await video.play();
      } catch (error) {
        console.warn('Video play interrupted:', error);
        // Intentar reproducir después de una interacción del usuario si es necesario
      }
    };

    if (location.pathname === '/') {
      // fadeIn
      setIsFading(true);
      const handleFadeInEnd = () => {
        fadeInVideo.style.opacity = '0';
        fadeOutVideo.style.opacity = '1';
        fadeInVideo.removeEventListener('ended', handleFadeInEnd);
        setIsFading(false);
      };
      fadeInVideo.addEventListener('ended', handleFadeInEnd);
      playVideo(fadeInVideo);
      fadeOutVideo.currentTime = 0;
    } else if (lastVisited === '/') {
      // fadeOut
      setIsFading(true);
      const handleFadeOutEnd = () => {
        fadeInVideo.style.opacity = '1';
        fadeOutVideo.style.opacity = '0';
        fadeOutVideo.removeEventListener('ended', handleFadeOutEnd);
        setIsFading(false);
      };
      fadeOutVideo.addEventListener('ended', handleFadeOutEnd);
      playVideo(fadeOutVideo);
      fadeInVideo.currentTime = 0;
    }
  }, [location.pathname, lastVisited]);

  return (

    <AppBar position="fixed" sx={{ backdropFilter: 'blur(10px)', backgroundColor: '#CFCFCF', color: 'black', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', gap: '10px' }}>
      <div style={{display: 'flex', alignItems: 'center'}} className='div-bienvenida'>
        <div className='animacion-container'>
          <video ref={fadeInRef} src="/FadeIn.mp4" className='animacion-video' muted style={{zIndex: 2}}></video>
          <video ref={fadeOutRef} src="/FadeOut.mp4" className='animacion-video' muted style={{zIndex: 1}}></video>
          <img src="/Botella.webp" alt='' className={imgClass}/>
        </div>
        <Link to="/" className="bienvenida-link" onClick={(e) => isFading && e.preventDefault()}>Bienvenida</Link>
      </div>
      
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }} style={{color:'black'}}>
        <Button color="inherit" component={Link} to="/ventas" disabled={isFading} disableRipple sx={{ '&.Mui-disabled': { color: 'black', opacity: 1 }, '&:hover': { backgroundColor: 'transparent' }, '&:active': { backgroundColor: 'transparent' } }}>Ventas</Button>
        <Button color="inherit" component={Link} to="/clientes" disabled={isFading} disableRipple sx={{ '&.Mui-disabled': { color: 'black', opacity: 1 }, '&:hover': { backgroundColor: 'transparent' }, '&:active': { backgroundColor: 'transparent' } }}>Clientes</Button>
        <Button color="inherit" component={Link} to="/empleados" disabled={isFading} disableRipple sx={{ '&.Mui-disabled': { color: 'black', opacity: 1 }, '&:hover': { backgroundColor: 'transparent' }, '&:active': { backgroundColor: 'transparent' } }}>Empleados</Button>
        <Button color="inherit" component={Link} to="/compras" disabled={isFading} disableRipple sx={{ '&.Mui-disabled': { color: 'black', opacity: 1 }, '&:hover': { backgroundColor: 'transparent' }, '&:active': { backgroundColor: 'transparent' } }}>Compras</Button>
        <Button color="inherit" component={Link} to="/inventario" disabled={isFading} disableRipple sx={{ '&.Mui-disabled': { color: 'black', opacity: 1 }, '&:hover': { backgroundColor: 'transparent' }, '&:active': { backgroundColor: 'transparent' } }}>Inventario</Button>
      </Box>
      <Toolbar>
        <TextField variant="outlined" size="small" placeholder="Buscar..." sx={{ backgroundColor: 'white', borderRadius: 1, mr: 2 }} />
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;