const db = require('../config/db');
const scanner = require('../utils/socketNotifier');
const { logAction, getDiffDescription } = require('../utils/logger');

exports.getVentas = async (req, res) => {
    try {
        const result = await db.execute('SELECT v.Id_Venta, v.Id_Empleado, v.Id_Cliente, v.FechaRegistro, v.TotalVenta, e.Nombres AS EmpleadoNombres, e.Apellidos AS EmpleadoApellidos, c.Nombres AS ClienteNombres, c.Apellidos AS ClienteApellidos, '
            + '(SELECT GROUP_CONCAT(i.Nombre, ", ") FROM DetallesDeVentas dv JOIN Inventario i ON dv.Id_Producto = i.Id_Producto WHERE dv.Id_Venta = v.Id_Venta) AS Productos '
            + 'FROM Ventas v '
            + 'INNER JOIN Empleados e ON v.Id_Empleado = e.Id_Empleado '
            + 'INNER JOIN Clientes c ON v.Id_Cliente = c.Id_Cliente '
            + 'ORDER BY v.FechaRegistro ASC'
        );
        const data = result.rows.map(row => ({
            id: row[0],
            empleado: { id: row[1], nombres: row[5], apellidos: row[6] },
            cliente: { id: row[2], nombres: row[7], apellidos: row[8] },
            fechaRegistro: row[3],
            totalVenta: row[4],
            productos: row[9] || ''
        }));
        res.json(data);
    } catch (error) {
        console.error('Error al obtener las ventas:', error);
        res.status(500).json({ error: 'Error al obtener los datos de las ventas' });
    }
};

exports.addVenta = async (req, res) => {
    try {
        const { id_empleado, id_cliente, fechaRegistro, totalVenta } = req.body;
        const { id: userId, username } = req.user;
        const result = await db.execute('INSERT INTO Ventas (Id_Empleado, Id_Cliente, FechaRegistro, TotalVenta) VALUES (?, ?, ?, ?)', [id_empleado, id_cliente, fechaRegistro, totalVenta]);
        const ventaIdResult = await db.execute('SELECT last_insert_rowid() as id');
        const ventaId = ventaIdResult.rows[0][0];
        await logAction(userId, username, 'Ventas', 'INSERT', `Venta agregada (ID ${ventaId}) por un total de ${totalVenta}`);
        scanner.notificarVentas();
        res.status(201).json({ message: 'Venta agregada correctamente', id_venta: ventaId });
    } catch (error) {
        console.error('Error adding sale:', error);
        res.status(500).json({ error: 'Error al agregar la venta' });
    }
};

exports.updateVenta = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_empleado, id_cliente, fechaRegistro, totalVenta } = req.body;
        const { id: userId, username } = req.user;

        // Comparación de cambios con nombres de empleado y cliente
        const oldResult = await db.execute(
            `SELECT v.Id_Empleado, v.Id_Cliente, v.FechaRegistro, v.TotalVenta,
                    e.Nombres || ' ' || e.Apellidos as EmpleadoNombre,
                    c.Nombres || ' ' || c.Apellidos as ClienteNombre
             FROM Ventas v
             LEFT JOIN Empleados e ON v.Id_Empleado = e.Id_Empleado
             LEFT JOIN Clientes c ON v.Id_Cliente = c.Id_Cliente
             WHERE v.Id_Venta = ?`,
            [id]
        );

        if (oldResult.rows.length > 0) {
            const row = oldResult.rows[0];
            const oldData = {
                fechaRegistro: row[2],
                totalVenta: row[3]
            };

            // Crear objeto sin IDs para la comparación
            const newDataForDiff = {
                fechaRegistro,
                totalVenta
            };

            // Obtener nombres nuevos si cambiaron
            let empleadoNombreViejo = row[4];
            let clienteNombreViejo = row[5];
            let empleadoNombreNuevo = empleadoNombreViejo;
            let clienteNombreNuevo = clienteNombreViejo;

            if (id_empleado !== row[0]) {
                const empResult = await db.execute('SELECT Nombres || " " || Apellidos as Nombre FROM Empleados WHERE Id_Empleado = ?', [id_empleado]);
                empleadoNombreNuevo = empResult.rows.length > 0 ? empResult.rows[0][0] : `ID ${id_empleado}`;
            }

            if (id_cliente !== row[1]) {
                const cliResult = await db.execute('SELECT Nombres || " " || Apellidos as Nombre FROM Clientes WHERE Id_Cliente = ?', [id_cliente]);
                clienteNombreNuevo = cliResult.rows.length > 0 ? cliResult.rows[0][0] : `ID ${id_cliente}`;
            }

            const diff = getDiffDescription(oldData, newDataForDiff);
            let description = '';

            // Agregar cambios de empleado/cliente primero
            const nameChanges = [];
            if (id_empleado !== row[0]) {
                nameChanges.push(`Empleado: "${empleadoNombreViejo}" → "${empleadoNombreNuevo}"`);
            }
            if (id_cliente !== row[1]) {
                nameChanges.push(`Cliente: "${clienteNombreViejo}" → "${clienteNombreNuevo}"`);
            }

            // Construir descripción final
            if (nameChanges.length > 0 && diff !== 'Sin cambios detectados') {
                description = `Venta actualizada (ID ${id}): ${nameChanges.join(', ')} | ${diff}`;
            } else if (nameChanges.length > 0) {
                description = `Venta actualizada (ID ${id}): ${nameChanges.join(', ')}`;
            } else {
                description = `Venta actualizada (ID ${id}): ${diff}`;
            }

            await logAction(userId, username, 'Ventas', 'UPDATE', description);
        }

        await db.execute('UPDATE Ventas SET Id_Empleado = ?, Id_Cliente = ?, FechaRegistro = ?, TotalVenta = ? WHERE Id_Venta = ?', [id_empleado, id_cliente, fechaRegistro, totalVenta, id]);
        scanner.notificarVentas();
        res.json({ message: 'Venta actualizada correctamente' });
    } catch (error) {
        console.error('Error updating sale:', error);
        res.status(500).json({ error: 'Error al actualizar la venta' });
    }
};

// Detalles de Ventas
exports.getDetallesVenta = async (req, res) => {
    try {
        const { id_venta } = req.params;
        const result = await db.execute(
            'SELECT dv.Id_DetalleDeVenta, dv.Id_Producto, dv.Id_Venta, dv.CantidadPaquetes, dv.CantidadUnidades, dv.PrecioUnitario, dv.Subtotal, i.Nombre as ProductoNombre, i.TipoPaquete FROM DetallesDeVentas dv INNER JOIN Inventario i ON dv.Id_Producto = i.Id_Producto WHERE dv.Id_Venta = ? ORDER BY dv.Id_DetalleDeVenta ASC',
            [id_venta]
        );
        const data = result.rows.map(row => ({
            id: row[0], id_producto: row[1], id_venta: row[2], cantidadPaquetes: row[3], cantidadUnidades: row[4], precioUnitario: row[5], subtotal: row[6], producto: { nombre: row[7], tipoPaquete: row[8] }
        }));
        res.json(data);
    } catch (error) {
        console.error('Error fetching sale details:', error);
        res.status(500).json({ error: 'Error al obtener los detalles de venta' });
    }
};

exports.addDetalleBatch = async (req, res) => {
    try {
        const { id_venta, detalles } = req.body;
        const { id: userId, username } = req.user;
        const productNames = [];

        for (const detalle of detalles) {
            await db.execute(
                'INSERT INTO DetallesDeVentas (Id_Venta, Id_Producto, CantidadPaquetes, CantidadUnidades, PrecioUnitario, Subtotal) VALUES (?, ?, ?, ?, ?, ?)',
                [id_venta, detalle.id_producto, detalle.cantidadPaquetes, detalle.cantidadUnidades, detalle.precioUnitario, detalle.subtotal]
            );

            // Obtener nombre del producto
            const productResult = await db.execute('SELECT Nombre FROM Inventario WHERE Id_Producto = ?', [detalle.id_producto]);
            if (productResult.rows.length > 0) {
                productNames.push(productResult.rows[0][0]);
            }
        }

        const productList = productNames.length > 0 ? ` (${productNames.join(', ')})` : '';
        await logAction(userId, username, 'DetallesDeVentas', 'INSERT', `${detalles.length} producto(s) agregado(s) a la venta ID ${id_venta}${productList}`);
        scanner.notificarDetallesVentas();
        res.status(201).json({ message: 'Detalles de venta agregados correctamente' });
    } catch (error) {
        console.error('Error adding sale details batch:', error);
        res.status(500).json({ error: 'Error al agregar los detalles de venta' });
    }
};

exports.updateDetallesVenta = async (req, res) => {
    try {
        const { id_venta, detalles } = req.body;
        const { id: userId, username } = req.user;

        // Obtener detalles existentes
        const existingResult = await db.execute(
            'SELECT Id_DetalleDeVenta, Id_Producto, CantidadPaquetes, CantidadUnidades, PrecioUnitario, Subtotal FROM DetallesDeVentas WHERE Id_Venta = ?',
            [id_venta]
        );

        const existingDetails = existingResult.rows.map(row => ({
            id: row[0],
            id_producto: row[1],
            cantidadPaquetes: row[2],
            cantidadUnidades: row[3],
            precioUnitario: row[4],
            subtotal: row[5]
        }));

        // Crear mapas para comparación eficiente
        const existingMap = new Map(existingDetails.map(d => [d.id, d]));
        const newMap = new Map(detalles.filter(d => d.id).map(d => [d.id, d]));

        const productosAgregados = [];
        const productosActualizados = [];
        const productosEliminados = [];

        // Identificar detalles a ELIMINAR (existen en BD pero no en los nuevos)
        for (const existing of existingDetails) {
            if (!newMap.has(existing.id)) {
                // Obtener nombre del producto
                const productResult = await db.execute('SELECT Nombre FROM Inventario WHERE Id_Producto = ?', [existing.id_producto]);
                const productName = productResult.rows.length > 0 ? productResult.rows[0][0] : `ID ${existing.id_producto}`;

                await db.execute('DELETE FROM DetallesDeVentas WHERE Id_DetalleDeVenta = ?', [existing.id]);
                productosEliminados.push(productName);
            }
        }

        // Procesar detalles nuevos o actualizados
        for (const detalle of detalles) {
            // Obtener nombre del producto
            const productResult = await db.execute('SELECT Nombre FROM Inventario WHERE Id_Producto = ?', [detalle.id_producto]);
            const productName = productResult.rows.length > 0 ? productResult.rows[0][0] : `ID ${detalle.id_producto}`;

            if (detalle.id && existingMap.has(detalle.id)) {
                // ACTUALIZAR: el detalle existe
                const existing = existingMap.get(detalle.id);
                const hasChanges =
                    existing.id_producto !== detalle.id_producto ||
                    existing.cantidadPaquetes !== detalle.cantidadPaquetes ||
                    existing.cantidadUnidades !== detalle.cantidadUnidades ||
                    existing.precioUnitario !== detalle.precioUnitario ||
                    existing.subtotal !== detalle.subtotal;

                if (hasChanges) {
                    await db.execute(
                        'UPDATE DetallesDeVentas SET Id_Producto = ?, CantidadPaquetes = ?, CantidadUnidades = ?, PrecioUnitario = ?, Subtotal = ? WHERE Id_DetalleDeVenta = ?',
                        [detalle.id_producto, detalle.cantidadPaquetes, detalle.cantidadUnidades, detalle.precioUnitario, detalle.subtotal, detalle.id]
                    );
                    productosActualizados.push(productName);
                }
            } else {
                // INSERTAR: detalle nuevo (sin id o id no existe en BD)
                await db.execute(
                    'INSERT INTO DetallesDeVentas (Id_Venta, Id_Producto, CantidadPaquetes, CantidadUnidades, PrecioUnitario, Subtotal) VALUES (?, ?, ?, ?, ?, ?)',
                    [id_venta, detalle.id_producto, detalle.cantidadPaquetes, detalle.cantidadUnidades, detalle.precioUnitario, detalle.subtotal]
                );
                productosAgregados.push(productName);
            }
        }

        // Registro detallado en el historial
        if (productosAgregados.length > 0) {
            await logAction(userId, username, 'DetallesDeVentas', 'INSERT',
                `${productosAgregados.length} agregado(s) a la venta ID ${id_venta}: ${productosAgregados.join(', ')}`);
        }
        if (productosActualizados.length > 0) {
            await logAction(userId, username, 'DetallesDeVentas', 'UPDATE',
                `${productosActualizados.length} actualizado(s) en la venta ID ${id_venta}: ${productosActualizados.join(', ')}`);
        }
        if (productosEliminados.length > 0) {
            await logAction(userId, username, 'DetallesDeVentas', 'DELETE',
                `${productosEliminados.length} eliminado(s) de la venta ID ${id_venta}: ${productosEliminados.join(', ')}`);
        }

        if (productosAgregados.length === 0 && productosActualizados.length === 0 && productosEliminados.length === 0) {
            await logAction(userId, username, 'DetallesDeVentas', 'UPDATE', `Detalles de venta ID ${id_venta} sin cambios`);
        }

        scanner.notificarDetallesVentas();
        res.json({
            message: 'Detalles de venta actualizados correctamente',
            stats: {
                agregados: productosAgregados.length,
                actualizados: productosActualizados.length,
                eliminados: productosEliminados.length
            }
        });
    } catch (error) {
        console.error('Error updating sale details:', error);
        res.status(500).json({ error: 'Error al actualizar los detalles de venta' });
    }
};

exports.deleteDetallesVenta = async (req, res) => {
    try {
        const { id_venta } = req.params;
        const { id: userId, username } = req.user;

        // Obtener nombres de productos antes de eliminar
        const detailsResult = await db.execute(
            'SELECT i.Nombre FROM DetallesDeVentas dv INNER JOIN Inventario i ON dv.Id_Producto = i.Id_Producto WHERE dv.Id_Venta = ?',
            [id_venta]
        );
        const productNames = detailsResult.rows.map(row => row[0]);
        const count = productNames.length;

        await db.execute('DELETE FROM DetallesDeVentas WHERE Id_Venta = ?', [id_venta]);

        const productList = productNames.length > 0 ? ` (${productNames.join(', ')})` : '';
        await logAction(userId, username, 'DetallesDeVentas', 'DELETE', `${count} producto(s) eliminado(s) de la venta ID ${id_venta}${productList}`);
        scanner.notificarDetallesVentas();
        res.json({ message: 'Detalles de venta eliminados correctamente' });
    } catch (error) {
        console.error('Error deleting sale details:', error);
        res.status(500).json({ error: 'Error al eliminar los detalles de venta' });
    }
};
