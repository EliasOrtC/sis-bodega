const db = require('../config/db');
const scanner = require('../utils/socketNotifier');
const { logAction, getDiffDescription } = require('../utils/logger');
const { deleteImage } = require('./imagekitController');

exports.getInventario = async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM Inventario');
        const data = result.rows.map(row => ({
            id: row[0], nombre: row[1], tipoPaquete: row[2], inventario: row[3], cantidadUnidades: row[4], cantidadPaquetes: row[5], precioVenta_Paq: row[6], precioCompra_Paq: row[7], imagen_url: row[8]
        }));
        res.json(data);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Error fetching inventory data' });
    }
};

exports.addInventario = async (req, res) => {
    try {
        const { nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq, imagen_url } = req.body;
        const { id: userId, username } = req.user;
        await db.execute('INSERT INTO Inventario (Nombre, TipoPaquete, Inventario, CantidadUnidades, CantidadPaquetes, PrecioVenta_Paq, PrecioCompra_Paq, Imagen_Url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq, imagen_url]);
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
        const { nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq, imagen_url } = req.body;
        const { id: userId, username } = req.user;

        // Comparación de cambios y limpieza de ImageKit
        const oldResult = await db.execute('SELECT * FROM Inventario WHERE Id_Producto = ?', [id]);
        if (oldResult.rows.length > 0) {
            const row = oldResult.rows[0];
            const oldImageUrl = row[8];
            const oldData = { nombre: row[1], tipoPaquete: row[2], inventario: row[3], cantidadUnidades: row[4], cantidadPaquetes: row[5], precioVenta_Paq: row[6], precioCompra_Paq: row[7], imagen_url: oldImageUrl };

            // NORMALIZAR PARA COMPARAR: eliminar dominio, transformaciones y slashes iniciales
            const normalize = (path) => {
                if (!path) return '';
                const parts = path.split('?')[0].split('/');
                return parts[parts.length - 1]; // Nos quedamos solo con el nombre del archivo
            };
            const normalizedOld = normalize(oldImageUrl);
            const normalizedNew = normalize(imagen_url);

            /*
            console.log(`Checking image change for Product ${id}:`);
            console.log(` - Old Raw: ${oldImageUrl} | Normalized: ${normalizedOld}`);
            console.log(` - New Raw: ${imagen_url} | Normalized: ${normalizedNew}`);
            */

            if (normalizedOld && normalizedOld !== normalizedNew) {
                // console.log(`>>> CHANGE DETECTED: Deleting old image from ImageKit: ${normalizedOld}`);
                await deleteImage(oldImageUrl);
            } else {
                // console.log(`>>> NO CHANGE: Skipping ImageKit deletion.`);
            }

            const diff = getDiffDescription(oldData, req.body);
            await logAction(userId, username, 'Inventario', 'UPDATE', `Producto ${nombre} (ID${id}): ${diff}`);
        }

        await db.execute('UPDATE Inventario SET Nombre = ?, TipoPaquete = ?, Inventario = ?, CantidadUnidades = ?, CantidadPaquetes = ?, PrecioVenta_Paq = ?, PrecioCompra_Paq = ?, Imagen_Url = ? WHERE Id_Producto = ?', [nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq, imagen_url, id]);
        scanner.notificarInventario();
        res.json({ message: 'Producto actualizado correctamente' });
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
};

exports.deleteInventario = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, username } = req.user;

        const oldResult = await db.execute('SELECT * FROM Inventario WHERE Id_Producto = ?', [id]);
        if (oldResult.rows.length > 0) {
            const row = oldResult.rows[0];
            const nombre = row[1];
            const oldImageUrl = row[8];

            // ELIMINAR IMAGEN DE IMAGEKIT
            if (oldImageUrl) {
                // console.log(`Deleting image from ImageKit for deleted product ${id}: ${oldImageUrl}`);
                await deleteImage(oldImageUrl);
            }

            await db.execute('DELETE FROM Inventario WHERE Id_Producto = ?', [id]);
            await logAction(userId, username, 'Inventario', 'DELETE', `Producto eliminado: ${nombre} (ID${id})`);
            scanner.notificarInventario();
            res.json({ message: 'Producto eliminado correctamente' });
        } else {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    } catch (error) {
        console.error('Error deleting inventory:', error);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
};
