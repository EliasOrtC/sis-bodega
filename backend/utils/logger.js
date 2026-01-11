const db = require('../config/db');

/**
 * Registra una acción en el historial de acciones.
 * @param {number|null} idUsuario - ID del usuario que realizó la acción.
 * @param {string|null} usuarioNombre - Nombre del usuario que realizó la acción.
 * @param {string} tabla - Nombre de la tabla afectada.
 * @param {string} accion - Tipo de acción (INSERT, UPDATE, DELETE).
 * @param {string} descripcion - Descripción detallada de la acción.
 */
const logAction = async (idUsuario, usuarioNombre, tabla, accion, descripcion) => {
    try {
        const fecha = new Date().toLocaleString('es-NI', { timeZone: 'America/Managua' });
        await db.execute(
            'INSERT INTO HistorialAcciones (Id_Usuario, UsuarioNombre, Tabla, Accion, Descripcion, Fecha) VALUES (?, ?, ?, ?, ?, ?)',
            [idUsuario, usuarioNombre, tabla, accion, descripcion, fecha]
        );
    } catch (error) {
        console.error('Error logging action:', error);
    }
};

/**
 * Compara dos objetos y devuelve una cadena describiendo las diferencias.
 */
const getDiffDescription = (oldData, newData) => {
    const changes = [];
    for (const key in newData) {
        // Ignorar campos de usuario y campos que no existen en el objeto viejo
        if (key === 'userId' || key === 'username' || oldData[key] === undefined) continue;

        const oldValue = oldData[key];
        const newValue = newData[key];

        // Comparación simple (convertir a string para evitar líos con tipos)
        if (String(oldValue) !== String(newValue)) {
            changes.push(`${key}: "${oldValue}" → "${newValue}"`);
        }
    }
    return changes.length > 0 ? `Cambios: ${changes.join(', ')}` : 'Sin cambios detectados';
};

module.exports = { logAction, getDiffDescription };
