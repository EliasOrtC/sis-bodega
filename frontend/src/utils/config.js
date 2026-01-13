// En desarrollo usa tu IP local, en producción (Render) usará la URL del servicio desplegado
export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')
    ? 'http://192.168.1.100:5001'
    : 'https://vuestro-backend-en-render.onrender.com'; // Deberás cambiar esto por la URL que te de Render
