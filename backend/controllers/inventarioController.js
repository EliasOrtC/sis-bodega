const db = require('../config/db');
const scanner = require('../utils/socketNotifier');
const { logAction, getDiffDescription } = require('../utils/logger');

exports.getInventario = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM Inventario');
        const data = result.rows.map(row => ({
            id: row[0], nombre: row[1], tipoPaquete: row[2], inventario: row[3], cantidadUnidades: row[4], cantidadPaquetes: row[5], precioVenta_Paq: row[6], precioCompra_Paq: row[7]
        }));
        res.json(data);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Error fetching inventory data' });
    }
};

exports.addInventario = async (req, res) => {
    try {
        const { nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq, userId, username } = req.body;
        await db.execute('INSERT INTO Inventario (Nombre, TipoPaquete, Inventario, CantidadUnidades, CantidadPaquetes, PrecioVenta_Paq, PrecioCompra_Paq) VALUES (?, ?, ?, ?, ?, ?, ?)', [nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq]);
        await logAction(userId, username, 'Inventario', 'INSERT', `Producto agregado: ${nombre}`);
        scanner.notificarInventario();
        res.status(201).json({ message: 'Producto agregado al inventario correctamente' });
    } catch (error) {
        console.error('Error adding inventory:', error);
        res.status(500).json({ error: 'Error al agregar el producto al inventario' });
    }
};

exports.updateInventario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq, userId, username } = req.body;

        // Comparación de cambios
        const oldResult = await db.execute('SELECT * FROM Inventario WHERE Id_Producto = ?', [id]);
        if (oldResult.rows.length > 0) {
            const row = oldResult.rows[0];
            const oldData = { nombre: row[1], tipoPaquete: row[2], inventario: row[3], cantidadUnidades: row[4], cantidadPaquetes: row[5], precioVenta_Paq: row[6], precioCompra_Paq: row[7] };
            const diff = getDiffDescription(oldData, req.body);
            await logAction(userId, username, 'Inventario', 'UPDATE', `Producto ID ${id} (${nombre}): ${diff}`);
        }

        await db.execute('UPDATE Inventario SET Nombre = ?, TipoPaquete = ?, Inventario = ?, CantidadUnidades = ?, CantidadPaquetes = ?, PrecioVenta_Paq = ?, PrecioCompra_Paq = ? WHERE Id_Producto = ?', [nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq, id]);
        scanner.notificarInventario();
        res.json({ message: 'Producto actualizado correctamente' });
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
};
