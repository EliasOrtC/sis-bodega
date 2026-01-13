const db = require('../config/db');
const scanner = require('../utils/socketNotifier');
const { logAction, getDiffDescription } = require('../utils/logger');

exports.getClientes = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM Clientes');
        const data = result.rows.map(row => ({
            id: row[0],
            nombres: row[1],
            apellidos: row[2],
            correo: row[3],
            telefono: row[4],
            fechaRegistro: row[5],
            numCedula: row[6],
            direccion: row[7]
        }));
        res.json(data);
    } catch (error) {
        console.error('Error al obtener los clientes:', error);
        res.status(500).json({ error: 'Error al obtener los datos de los clientes' });
    }
};

exports.addCliente = async (req, res) => {
    try {
        const { nombres, apellidos, correo, telefono, fechaRegistro, numCedula, direccion } = req.body;
        const { id: userId, username } = req.user;
        await db.execute('INSERT INTO Clientes (Nombres, Apellidos, Correo, Telefono, FechaRegistro, NumCedula, Direccion) VALUES (?, ?, ?, ?, ?, ?, ?)', [nombres, apellidos, correo, telefono, fechaRegistro, numCedula, direccion]);
        await logAction(userId, username, 'Clientes', 'INSERT', `Cliente agregado: ${nombres} ${apellidos}`);
        scanner.notificarClientes();
        res.status(201).json({ message: 'Cliente agregado correctamente' });
    } catch (error) {
        console.error('Error adding client:', error);
        res.status(500).json({ error: 'Error al agregar el cliente' });
    }
};

exports.updateCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombres, apellidos, correo, telefono, fechaRegistro, numCedula, direccion } = req.body;
        const { id: userId, username } = req.user;

        // Obtener datos viejos para comparar
        const oldResult = await db.execute('SELECT * FROM Clientes WHERE Id_Cliente = ?', [id]);
        if (oldResult.rows.length > 0) {
            const row = oldResult.rows[0];
            const oldData = { nombres: row[1], apellidos: row[2], correo: row[3], telefono: row[4], fechaRegistro: row[5], numCedula: row[6], direccion: row[7] };
            const diff = getDiffDescription(oldData, req.body);
            await logAction(userId, username, 'Clientes', 'UPDATE', `Cliente ID ${id} (${nombres}): ${diff}`);
        }

        await db.execute('UPDATE Clientes SET Nombres = ?, Apellidos = ?, Correo = ?, Telefono = ?, FechaRegistro = ?, NumCedula = ?, Direccion = ? WHERE Id_Cliente = ?', [nombres, apellidos, correo, telefono, fechaRegistro, numCedula, direccion, id]);
        scanner.notificarClientes();
        res.json({ message: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
};
