const db = require('../config/db');
const scanner = require('../utils/socketNotifier');
const { logAction, getDiffDescription } = require('../utils/logger');

exports.getCompras = async (req, res) => {
    try {
        const result = await db.execute('SELECT c.Id_Compra, c.FechaDeCompra, c.Id_Proveedor, c.TotalCompra, p.NombreProveedor FROM Compras c LEFT JOIN Proveedor p ON c.Id_Proveedor = p.Id_Proveedor');
        const data = result.rows.map(row => ({
            id: row[0], fechaDeCompra: row[1], id_proveedor: row[2], totalCompra: row[3], proveedor: row[4] ? { nombreProveedor: row[4] } : null
        }));
        res.json(data);
    } catch (error) {
        console.error('Error al obtener las compras:', error);
        res.status(500).json({ error: 'Error al obtener los datos de las compras' });
    }
};

exports.addCompra = async (req, res) => {
    try {
        const { fechaDeCompra, id_proveedor, totalCompra, userId, username } = req.body;
        await db.execute('INSERT INTO Compras (FechaDeCompra, Id_Proveedor, TotalCompra) VALUES (?, ?, ?)', [fechaDeCompra, id_proveedor, totalCompra]);
        await logAction(userId, username, 'Compras', 'INSERT', `Compra agregada por un total de ${totalCompra}`);
        scanner.notificarCompras();
        res.status(201).json({ message: 'Compra agregada correctamente' });
    } catch (error) {
        console.error('Error adding purchase:', error);
        res.status(500).json({ error: 'Error al agregar la compra' });
    }
};

exports.updateCompra = async (req, res) => {
    try {
        const { id } = req.params;
        const { fechaDeCompra, id_proveedor, totalCompra, userId, username } = req.body;

        // Comparación de cambios
        const oldResult = await db.execute('SELECT * FROM Compras WHERE Id_Compra = ?', [id]);
        if (oldResult.rows.length > 0) {
            const row = oldResult.rows[0];
            const oldData = { fechaDeCompra: row[1], id_proveedor: row[2], totalCompra: row[3] };
            const diff = getDiffDescription(oldData, req.body);
            await logAction(userId, username, 'Compras', 'UPDATE', `Compra ID ${id}: ${diff}`);
        }

        await db.execute('UPDATE Compras SET FechaDeCompra = ?, Id_Proveedor = ?, TotalCompra = ? WHERE Id_Compra = ?', [fechaDeCompra, id_proveedor, totalCompra, id]);
        scanner.notificarCompras();
        res.json({ message: 'Compra actualizada correctamente' });
    } catch (error) {
        console.error('Error updating purchase:', error);
        res.status(500).json({ error: 'Error al actualizar la compra' });
    }
};

// Proveedores
exports.getProveedores = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM Proveedor');
        const data = result.rows.map(row => ({
            id: row[0], nombreProveedor: row[1], telefono: row[2], direccion: row[3]
        }));
        res.json(data);
    } catch (error) {
        console.error('Error al obtener los proveedores:', error);
        res.status(500).json({ error: 'Error al obtener los datos de los proveedores' });
    }
};
