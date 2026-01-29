const db = require('../config/db');

exports.getVentasMensuales = async (req, res) => {
    try {
        const result = await db.execute(`
      SELECT strftime('%Y-%m', FechaRegistro) as mes, SUM(TotalVenta) as total
      FROM Ventas
      GROUP BY mes
      ORDER BY mes ASC
    `);
        const data = result.rows.map(row => ({ mes: row[0], total: parseFloat(row[1]) || 0 }));
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
      LIMIT 10
    `);
        const data = result.rows.map(row => ({ empleado: row[0], total: parseFloat(row[1]) || 0 }));
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

exports.getTicketPromedio = async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT strftime('%Y-%m', FechaRegistro) as mes, AVG(TotalVenta) as promedio
            FROM Ventas
            GROUP BY mes
            ORDER BY mes ASC
        `);
        const data = result.rows.map(row => ({ mes: row[0], promedio: parseFloat(row[1]) || 0 }));
        res.json(data);
    } catch (error) {
        console.error('Error en ticket promedio:', error);
        res.status(500).json({ error: 'Error al obtener ticket promedio' });
    }
};

exports.getVentasSemanales = async (req, res) => {
    try {
        // Optimización masiva: Realizar el cálculo de agregación directamente en SQL
        // Evitamos descargar miles de filas a la RAM de Node.js
        const result = await db.execute(`
            SELECT 
                CASE CAST(strftime('%w', FechaRegistro) AS INTEGER)
                    WHEN 0 THEN 'Dom' WHEN 1 THEN 'Lun' WHEN 2 THEN 'Mar'
                    WHEN 3 THEN 'Mié' WHEN 4 THEN 'Jue' WHEN 5 THEN 'Vie'
                    WHEN 6 THEN 'Sáb'
                END as dia_semana,
                SUM(TotalVenta) as total,
                strftime('%w', FechaRegistro) as idx
            FROM Ventas
            WHERE FechaRegistro IS NOT NULL
            GROUP BY dia_semana
            ORDER BY idx ASC
        `);

        const data = result.rows.map(row => ({
            dia: row[0],
            total: parseFloat(row[1]) || 0
        }));

        res.json(data);
    } catch (error) {
        console.error('Error en ventas semanales:', error);
        res.status(500).json({ error: 'Error al obtener ventas semanales' });
    }
};

exports.getDistribucionPrecios = async (req, res) => {
    try {
        // Rangos de precios: Bajo (<500), Medio (500-2000), Alto (>2000)
        // Puedes ajustar estos valores según la realidad del negocio
        const result = await db.execute(`
            SELECT 
                CASE 
                    WHEN TotalVenta < 500 THEN 'Menor a 500'
                    WHEN TotalVenta BETWEEN 500 AND 2000 THEN '500 - 2,000'
                    ELSE 'Mayor a 2,000'
                END as rango,
                COUNT(*) as cantidad
            FROM Ventas
            GROUP BY rango
        `);
        const data = result.rows.map(row => ({ rango: row[0], cantidad: row[1] }));
        res.json(data);
    } catch (error) {
        console.error('Error en distribución de precios:', error);
        res.status(500).json({ error: 'Error al obtener distribución de precios' });
    }
};

exports.getProductosBajaRotacion = async (req, res) => {
    try {
        // Productos que NO han tenido salida en los últimos 30 días.
        // Incluye productos que nunca se han vendido o cuya última venta fue hace > 30 días.

        // Usamos 'localtime' para sincronizar con la hora del sistema si las fechas se guardaron localmente
        const result = await db.execute(`
            SELECT i.Nombre, i.CantidadPaquetes
            FROM Inventario i
            WHERE i.Id_Producto NOT IN (
                SELECT DISTINCT dv.Id_Producto 
                FROM DetallesDeVentas dv
                JOIN Ventas v ON dv.Id_Venta = v.Id_Venta
                WHERE date(v.FechaRegistro) >= date('now', 'localtime', '-15 days')
            )
            AND i.CantidadPaquetes > 0 -- Opcional: Solo mostrar lo que sí tenemos en stock estancado
            ORDER BY i.CantidadPaquetes DESC
            LIMIT 10
        `);
        const data = result.rows.map(row => ({ nombre: row[0], stock: row[1] }));
        res.json(data);
    } catch (error) {
        console.error('Error en baja rotación:', error);
        res.status(500).json({ error: 'Error al obtener productos de baja rotación' });
    }
};
