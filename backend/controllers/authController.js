const db = require('../config/db');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await db.execute('SELECT * FROM Usuarios WHERE NUsuario = ?', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        // Asumiendo índices: 0:id, 1:NombreCompleto, 2:NUsuario, 3:Contraseña, 4:Email, 5:rol
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user[3]);
        if (!isValid) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const userData = { id: user[0], username: user[2], rol: user[5] };
        const token = jwt.sign(userData, process.env.JWT_SECRET || 'clave_temporal_por_si_no_hay_env', { expiresIn: '8h' });

        res.json({
            message: 'Login exitoso',
            user: userData,
            token: token
        });
    } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};
