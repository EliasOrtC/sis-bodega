const db = require('../config/db');

exports.getHistorial = async (req, res) => {
    try {
        const result = await db.execute('SELECT Id_Accion, Id_Usuario, UsuarioNombre, Tabla, Accion, Descripcion, Fecha FROM HistorialAcciones ORDER BY Id_Accion DESC');
        const data = result.rows.map(row => ({
            id: row[0],
            id_usuario: row[1],
            usuarioNombre: row[2],
            tabla: row[3],
            accion: row[4],
            descripcion: row[5],
            fecha: row[6]
        }));
        res.json(data);
    } catch (error) {
        console.error('Error al obtener el historial:', error);
        res.status(500).json({ error: 'Error al obtener el historial de acciones' });
    }
};
