const db = require('../config/db');

exports.getVentasMensuales = async (req, res) => {
    try {
        const result = await db.execute(`
      SELECT strftime('%Y-%m', FechaRegistro) as mes, SUM(TotalVenta) as total
      FROM Ventas
      GROUP BY mes
      ORDER BY mes ASC
    `);
        const data = result.rows.map(row => ({ mes: row[0], total: row[1] }));
        res.json(data);
    } catch (error) {
        console.error('Error en ventas mensuales:', error);
        res.status(500).json({ error: 'Error al obtener ventas mensuales' });
    }
};

exports.getProductosEstrella = async (req, res) => {
    try {
        const result = await db.execute(`
      SELECT i.Nombre, SUM(dv.CantidadPaquetes) as total_paquetes
      FROM DetallesDeVentas dv
      JOIN Inventario i ON dv.Id_Producto = i.Id_Producto
      GROUP BY i.Nombre
      ORDER BY total_paquetes DESC
      LIMIT 5
    `);
        const data = result.rows.map(row => ({ nombre: row[0], cantidad: row[1] }));
        res.json(data);
    } catch (error) {
        console.error('Error en productos estrella:', error);
        res.status(500).json({ error: 'Error al obtener productos estrella' });
    }
};

exports.getRendimientoEmpleados = async (req, res) => {
    try {
        const result = await db.execute(`
      SELECT e.Nombres || ' ' || e.Apellidos as empleado, SUM(v.TotalVenta) as total_ventas
      FROM Ventas v
      JOIN Empleados e ON v.Id_Empleado = e.Id_Empleado
      GROUP BY empleado
      ORDER BY total_ventas DESC
    `);
        const data = result.rows.map(row => ({ empleado: row[0], total: row[1] }));
        res.json(data);
    } catch (error) {
        console.error('Error en rendimiento empleados:', error);
        res.status(500).json({ error: 'Error al obtener rendimiento de empleados' });
    }
};

exports.getNivelesStock = async (req, res) => {
    try {
        const result = await db.execute(`
      SELECT Nombre, CantidadPaquetes
      FROM Inventario
      ORDER BY CantidadPaquetes ASC
      LIMIT 20
    `);
        const data = result.rows.map(row => ({ nombre: row[0], stock: row[1] }));
        res.json(data);
    } catch (error) {
        console.error('Error en niveles de stock:', error);
        res.status(500).json({ error: 'Error al obtener niveles de stock' });
    }
};
