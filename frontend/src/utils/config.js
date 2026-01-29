// Configuración dinámica de la API:
// Detecta si estamos en una red local (IPs privadas o localhost)
const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.match(/^192\.168\./) ||
    window.location.hostname.match(/^10\./) ||
    window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
    !window.location.hostname.includes('.'); // Nombres de PC (ej: http://MARVIN)

export const API_BASE_URL = isLocal
    ? `${window.location.protocol}//${window.location.hostname}:5001`
    : 'https://vuestro-backend-en-render.onrender.com';
