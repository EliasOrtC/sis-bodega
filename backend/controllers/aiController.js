const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/db');
const { recordUsage, markExhausted, getSummary, getUsage } = require('../utils/quotaTracker');

/**
 * Herramientas de consulta a la base de datos (SINCRONIZADAS Y EXHAUSTIVAS)
 */
const dbTools = {
    consultarInventario: async () => {
        try {
            const result = await db.execute('SELECT * FROM Inventario LIMIT 100');
            return {
                productos: result.rows.map(row => ({
                    id: row[0], nombre: row[1], tipoPaquete: row[2], stockTotal: row[3], unidades: row[4], paquetes: row[5], precioVenta: row[6], precioCompra: row[7]
                }))
            };
        } catch (error) { return { error: "Error al consultar inventario." }; }
    },
    consultarVentas: async () => {
        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().split('T')[0];

            const query = `
                SELECT  
                    v.Id_Venta,
                    v.FechaRegistro,  
                    e.Nombres || ' ' || e.Apellidos as Vendedor,
                    c.Nombres || ' ' || c.Apellidos as Cliente,
                    i.Nombre as Producto, 
                    d.CantidadPaquetes, 
                    d.cantidadUnidades,
                    d.PrecioUnitario, 
                    i.PrecioCompra_Paq,
                    v.TotalVenta,
                    i.TipoPaquete,
                    ROUND(CAST(d.CantidadPaquetes * i.TipoPaquete + d.cantidadUnidades AS REAL) / i.TipoPaquete, 3) as VolumenTotal
                FROM Ventas v
                LEFT JOIN DetallesDeVentas d ON v.Id_Venta = d.Id_Venta
                LEFT JOIN Inventario i ON d.Id_Producto = i.Id_Producto
                LEFT JOIN Empleados e ON v.Id_Empleado = e.Id_Empleado
                LEFT JOIN Clientes c ON v.Id_Cliente = c.Id_Cliente
                WHERE v.FechaRegistro < ?
                ORDER BY v.FechaRegistro ASC
                LIMIT 50
            `;
            const result = await db.execute(query, [tomorrow]);

            const ventasMap = new Map();
            result.rows.forEach(row => {
                const [id, fecha, vendedor, cliente, prod, cantpq, cantun, precio, costo, total, tipo, volTotal] = row;
                if (!ventasMap.has(id)) {
                    ventasMap.set(id, { id, fecha, vendedor, cliente, detalles: [], total });
                }
                if (prod) {
                    ventasMap.get(id).detalles.push({
                        producto: prod,
                        volumenTotal: volTotal,
                        precioVenta: precio
                    });
                }
            });

            return { ventas: Array.from(ventasMap.values()) };
        } catch (error) { console.error(error); return { error: "Error al consultar ventas detalladas." }; }
    },
    buscarPersona: async (args) => {
        const query = args?.nombre;
        if (!query) return { error: "Debes proporcionar un nombre para buscar." };
        try {
            // Separar por conectores comunes si vienen varios nombres (y, o, comas)
            const terminos = query.split(/ y | o |;|, /gi).map(t => t.trim()).filter(t => t.length >= 2);
            if (terminos.length === 0) terminos.push(query.trim());

            let resultadosTotales = [];
            const seen = new Set();

            for (const term of terminos) {
                // Normalizar el término de búsqueda (quitar tildes y minúsculas)
                const termNorm = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const pattern = `%${termNorm}%`;

                // Función SQL para quitar tildes en SQLite
                const sqlNorm = (col) => `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(${col}), 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u')`;

                // Búsqueda en Clientes
                const qClientes = `
                    SELECT 'Cliente' as tipo, Nombres, Apellidos, Telefono, Correo 
                    FROM Clientes 
                    WHERE ${sqlNorm("Nombres || ' ' || Apellidos")} LIKE ? 
                       OR ${sqlNorm("Apellidos || ' ' || Nombres")} LIKE ?
                       OR ${sqlNorm("Nombres")} LIKE ? 
                       OR ${sqlNorm("Apellidos")} LIKE ?
                    LIMIT 10
                `;
                const rClientes = await db.execute(qClientes, [pattern, pattern, pattern, pattern]);

                // Búsqueda en Empleados
                const qEmpleados = `
                    SELECT 'Empleado' as tipo, Nombres, Apellidos, Sector 
                    FROM Empleados 
                    WHERE ${sqlNorm("Nombres || ' ' || Apellidos")} LIKE ? 
                       OR ${sqlNorm("Apellidos || ' ' || Nombres")} LIKE ?
                       OR ${sqlNorm("Nombres")} LIKE ? 
                       OR ${sqlNorm("Apellidos")} LIKE ?
                    LIMIT 10
                `;
                const rEmpleados = await db.execute(qEmpleados, [pattern, pattern, pattern, pattern]);

                const r = [...(rClientes.rows || []), ...(rEmpleados.rows || [])];

                r.forEach(row => {
                    const key = `${row[0]}-${row[1]}-${row[2]}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        resultadosTotales.push({
                            tipo: row[0],
                            nombreCompleto: row[1] + ' ' + row[2],
                            detalle: row[3] || '',
                            contacto: row[4] || ''
                        });
                    }
                });
            }

            if (resultadosTotales.length === 0) {
                return { mensaje: `No se encontró a nadie que coincida con los términos: ${terminos.join(', ')}.` };
            }

            return { resultados: resultadosTotales };
        } catch (error) {
            console.error("Error en buscarPersona:", error);
            return { error: "Error en la búsqueda de persona." };
        }
    },
    obtenerRankingVentasReales: async (args) => {
        try {
            const now = new Date();
            let start, end;

            // Lógica flexible de periodos
            if (args?.periodo === 'mes_anterior') {
                const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                start = prev.toISOString().split('T')[0];
                end = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            } else if (args?.mes && args?.año) {
                // Para consultas específicas (ej: hace 5 meses o año pasado)
                start = `${args.año}-${String(args.mes).padStart(2, '0')}-01`;
                const nextMonth = new Date(args.año, args.mes, 1);
                end = nextMonth.toISOString().split('T')[0];
            } else {
                // Mes actual por defecto
                start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().split('T')[0];
            }

            const query = `
                SELECT 
                    i.Nombre, 
                    SUM(d.CantidadPaquetes) as total_paquetes, 
                    SUM(d.cantidadUnidades) as total_unidades,
                    ROUND(SUM(CAST(d.CantidadPaquetes * i.TipoPaquete + d.cantidadUnidades AS REAL) / i.TipoPaquete), 3) as volumen_total,
                    SUM(d.Subtotal) as total_monetario,
                    COUNT(DISTINCT v.Id_Venta) as numero_ventas
                FROM DetallesDeVentas d
                JOIN Ventas v ON d.Id_Venta = v.Id_Venta
                JOIN Inventario i ON d.Id_Producto = i.Id_Producto
                WHERE v.FechaRegistro >= ? AND v.FechaRegistro < ?
                GROUP BY i.Nombre
                ORDER BY volumen_total DESC
                LIMIT 15
            `;
            const result = await db.execute(query, [start, end]);
            return {
                periodo: `${start} hasta ${end}`,
                resumen: result.rows.map(row => ({
                    producto: row[0],
                    paquetes: row[1],
                    unidades: row[2],
                    volumenTotal: row[3],
                    totalDinero: row[4],
                    frecuencia: row[5]
                }))
            };
        } catch (error) { console.error(error); return { error: "Error al generar ranking de ventas." }; }
    },
    consultarCompras: async () => {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().split('T')[0];

            const query = `
                SELECT c.Id_Compra, c.FechaDeCompra, c.TotalCompra, p.NombreProveedor, i.Nombre, d.CantidadPaquetes, d.PrecioSinDescuento
                FROM Compras c
                LEFT JOIN DetallesDeCompras d ON c.Id_Compra = d.Id_Compra
                LEFT JOIN Proveedor p ON c.Id_Proveedor = p.Id_Proveedor
                LEFT JOIN Inventario i ON d.Id_Producto = i.Id_Producto
                WHERE c.FechaDeCompra < ?
                ORDER BY c.FechaDeCompra ASC, c.Id_Compra ASC
                LIMIT 50
            `;
            const result = await db.execute(query, [tomorrow]);

            const comprasMap = new Map();
            result.rows.forEach(row => {
                const [id, fecha, total, proveedor, prod, cantpq, costo] = row;
                if (!comprasMap.has(id)) {
                    comprasMap.set(id, { id, fecha, total, proveedor, detalles: [] });
                }
                if (prod) {
                    comprasMap.get(id).detalles.push({
                        producto: prod,
                        cantidadpq: cantpq,
                        costoUnitario: costo
                    });
                }
            });

            return { compras: Array.from(comprasMap.values()) };
        } catch (error) { console.error(error); return { error: "Error al consultar compras detalladas." }; }
    },
    consultarClientes: async () => {
        try {
            const result = await db.execute('SELECT Id_Cliente, Nombres, Apellidos, Correo, Telefono, Direccion FROM Clientes LIMIT 50');
            return {
                clientes: result.rows.map(row => ({
                    id: row[0], nombreCompleto: row[1] + ' ' + row[2], correo: row[3], telefono: row[4], direccion: row[5]
                }))
            };
        } catch (error) { return { error: "Error al consultar clientes." }; }
    },
    consultarEmpleados: async () => {
        try {
            const result = await db.execute('SELECT Id_Empleado, Nombres, Apellidos, Sector, Estado, SalarioBase FROM Empleados LIMIT 50');
            return {
                empleados: result.rows.map(row => ({
                    id: row[0],
                    nombreCompleto: row[1] + ' ' + row[2],
                    sector: row[3],
                    estado: row[4],
                    salarioBase: row[5]
                }))
            };
        } catch (error) { return { error: "Error al consultar empleados." }; }
    },
    obtenerHistoricoVentasMensuales: async () => {
        try {
            const query = `
                SELECT 
                    strftime('%Y-%m', FechaRegistro) as mes,
                    SUM(TotalVenta) as total
                FROM Ventas
                GROUP BY mes
                ORDER BY mes ASC
                LIMIT 6
            `;
            const result = await db.execute(query);
            return {
                historico: result.rows.map(row => ({ mes: row[0], total: row[1] }))
            };
        } catch (error) { console.error(error); return { error: "Error al obtener histórico mensual." }; }
    },
    consultarVentasPorDia: async (args) => {
        try {
            const now = new Date();
            let start, end;

            if (args?.todo) {
                // Todo el historial (desde el inicio registrado)
                start = '1900-01-01';
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().split('T')[0];
            } else if (args?.mes && args?.año) {
                // Mes específico
                start = `${args.año}-${String(args.mes).padStart(2, '0')}-01`;
                const nextMonth = new Date(args.año, args.mes, 1);
                end = nextMonth.toISOString().split('T')[0];
            } else {
                // Mes actual por defecto
                start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().split('T')[0];
            }

            const query = `
                SELECT 
                    v.FechaRegistro,
                    i.Nombre,
                    SUM(d.CantidadPaquetes) as paquetes,
                    SUM(d.cantidadUnidades) as unidades,
                    ROUND(SUM(CAST(d.CantidadPaquetes * i.TipoPaquete + d.cantidadUnidades AS REAL) / i.TipoPaquete), 3) as volumen_total
                FROM Ventas v
                JOIN DetallesDeVentas d ON v.Id_Venta = d.Id_Venta
                JOIN Inventario i ON d.Id_Producto = i.Id_Producto
                WHERE v.FechaRegistro >= ? AND v.FechaRegistro < ?
                GROUP BY v.FechaRegistro, i.Nombre
                ORDER BY v.FechaRegistro ASC
                LIMIT 100
            `;
            const result = await db.execute(query, [start, end]);

            const diasSemana = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
            const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            // 1. Pivotear por Fecha (Agrupar productos del mismo día)
            const diasMap = {};

            result.rows.forEach(row => {
                const fechaRaw = row[0];
                const producto = row[1];
                const volumen = row[4];

                if (!diasMap[fechaRaw]) {
                    const date = new Date(fechaRaw + 'T12:00:00');
                    const dia = String(date.getDate()).padStart(2, '0');
                    const numDiaSemana = date.getDay();
                    const nombreMes = meses[date.getMonth()];

                    // Calcular semana del mes
                    const primerDiaMes = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
                    const numSemana = Math.ceil((date.getDate() + primerDiaMes) / 7);

                    diasMap[fechaRaw] = {
                        fecha: fechaRaw,
                        name: `${diasSemana[numDiaSemana]} ${dia}`, // "MIE 03"
                        semanaKey: `${nombreMes} - Semana ${numSemana}`, // "Dic - Semana 1"
                        data: { name: `${diasSemana[numDiaSemana]} ${dia}` }
                    };
                }
                // Agregar producto al objeto del día
                diasMap[fechaRaw].data[producto] = volumen;
            });

            // 2. Agrupar por Semana
            const ventasPorSemana = {};
            Object.values(diasMap).forEach(diaObj => {
                if (!ventasPorSemana[diaObj.semanaKey]) {
                    ventasPorSemana[diaObj.semanaKey] = [];
                }
                ventasPorSemana[diaObj.semanaKey].push(diaObj.data);
            });

            return {
                periodo: `${start} hasta ${end}`,
                resumenSemanal: ventasPorSemana,
                nota: "Usa cada llave de 'resumenSemanal' como título del gráfico y su array como 'data'."
            };
        } catch (error) { console.error(error); return { error: "Error al consultar ventas por día." }; }
    },
    obtenerAlertasStock: async () => {
        try {
            const query = `
                SELECT 
                    i.Nombre, 
                    i.CantidadPaquetes, 
                    i.CantidadUnidades, 
                    i.PrecioCompra_Paq,
                    (SELECT p.NombreProveedor 
                     FROM DetallesDeCompras dc 
                     JOIN Compras c ON dc.Id_Compra = c.Id_Compra 
                     JOIN Proveedor p ON c.Id_Proveedor = p.Id_Proveedor 
                     WHERE dc.Id_Producto = i.Id_Producto 
                     ORDER BY c.FechaDeCompra DESC 
                     LIMIT 1) as UltimoProveedor
                FROM Inventario i 
                WHERE i.CantidadPaquetes < 30 
                ORDER BY i.CantidadPaquetes ASC
            `;
            const result = await db.execute(query);
            return {
                alertas: result.rows.map(row => ({
                    producto: row[0],
                    paquetes: row[1],
                    unidades: row[2],
                    costoPaquete: row[3],
                    proveedor: row[4] || "Proveedor no registrado"
                }))
            };
        } catch (error) {
            console.error(error);
            return { error: "Error al obtener alertas de stock con proveedores." };
        }
    },
    obtenerValorizacionInventario: async () => {
        try {
            const query = `SELECT SUM(Inventario * PrecioCompra_Paq) as valor_total FROM Inventario`;
            const result = await db.execute(query);
            return { valorTotalInventario: result.rows[0][0] || 0 };
        } catch (error) { return { error: "Error al calcular valorización." }; }
    },
    obtenerRankingRentabilidad: async () => {
        try {
            const query = `
                SELECT Nombre, PrecioVenta_Paq, PrecioCompra_Paq, 
                (PrecioVenta_Paq - PrecioCompra_Paq) as utilidad,
                ROUND(((PrecioVenta_Paq - PrecioCompra_Paq) / PrecioCompra_Paq) * 100, 2) as margen
                FROM Inventario WHERE PrecioCompra_Paq > 0 ORDER BY margen DESC LIMIT 10
            `;
            const result = await db.execute(query);
            return { productosRentables: result.rows.map(row => ({ producto: row[0], venta: row[1], costo: row[2], utilidad: row[3], margen: row[4] + '%' })) };
        } catch (error) { return { error: "Error al calcular rentabilidad." }; }
    },
    obtenerVentasPorVendedor: async () => {
        try {
            const query = `
                SELECT e.Nombres || ' ' || e.Apellidos as Vendedor, COUNT(v.Id_Venta), SUM(v.TotalVenta)
                FROM Ventas v JOIN Empleados e ON v.Id_Empleado = e.Id_Empleado
                WHERE v.FechaRegistro >= date('now', 'start of month') 
                GROUP BY Vendedor 
                ORDER BY SUM(v.TotalVenta) DESC
                LIMIT 10
            `;
            const result = await db.execute(query);
            return { rankingVendedores: result.rows.map(row => ({ vendedor: row[0], pedidos: row[1], total: row[2] })) };
        } catch (error) { return { error: "Error al obtener ventas por vendedor." }; }
    },
    obtenerMejoresClientes: async () => {
        try {
            const query = `
                SELECT c.Nombres || ' ' || c.Apellidos as Cliente, COUNT(v.Id_Venta), SUM(v.TotalVenta)
                FROM Ventas v JOIN Clientes c ON v.Id_Cliente = c.Id_Cliente
                GROUP BY Cliente ORDER BY SUM(v.TotalVenta) DESC LIMIT 10
            `;
            const result = await db.execute(query);
            return { mejoresClientes: result.rows.map(row => ({ cliente: row[0], visitas: row[1], total: row[2] })) };
        } catch (error) { return { error: "Error al obtener mejores clientes." }; }
    },
    verificarAnomaliasPrecios: async () => {
        try {
            const query = `SELECT Nombre, PrecioVenta_Paq, PrecioCompra_Paq FROM Inventario WHERE PrecioVenta_Paq <= PrecioCompra_Paq`;
            const result = await db.execute(query);
            return { anomalias: result.rows.map(row => ({ producto: row[0], venta: row[1], costo: row[2] })) };
        } catch (error) { return { error: "Error al verificar anomalías." }; }
    },
    consultarHistorialAcciones: async (args) => {
        try {
            const query = args?.producto ?
                `SELECT UsuarioNombre, Accion, Descripcion, Fecha FROM HistorialAcciones WHERE Descripcion LIKE ? ORDER BY Fecha ASC LIMIT 20` :
                `SELECT UsuarioNombre, Accion, Descripcion, Fecha FROM HistorialAcciones ORDER BY Fecha ASC LIMIT 20`;
            const result = await db.execute(query, args?.producto ? [`%${args.producto}%`] : []);
            return { historial: result.rows.map(row => ({ usuario: row[0], accion: row[1], detalle: row[2], fecha: row[3] })) };
        } catch (error) { return { error: "Error en historial." }; }
    }
};

const getSystemContext = async (userData, modelName = "general") => {
    try {
        const inv = await db.execute('SELECT COUNT(*) FROM Inventario');
        const vts = await db.execute('SELECT COUNT(*) FROM Ventas');
        const emp = await db.execute('SELECT COUNT(*) FROM Empleados');
        const now = new Date();
        const fullDate = now.toLocaleDateString('es-NI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const time = now.toLocaleTimeString('es-NI');

        let nameToUse = userData?.NombreCompleto?.trim() || "Estimado(a)";
        let userRole = userData?.rol || "usuario";

        return `Eres el Analista de Datos de SIS-Bodega. (Usuario: ${nameToUse}, Rol: ${userRole}).
        ESTADO ACTUAL: ${inv.rows[0][0]} Productos, ${vts.rows[0][0]} Ventas, ${emp.rows[0][0]} Empleados. Fecha: ${fullDate} ${time}.

        --- REGLA DE ORO (ANTI-ALUCINACIÓN) ---
        - NO INVENTES: No conoces nombres de personas, productos ni ventas de antemano.
        - PROHIBIDO INVENTAR DATOS DE CONTACTO: NUNCA inventes correos electrónicos, teléfonos o direcciones. Si necesitas dar estos datos y no los tienes de una herramienta en este turno, BUSCA a la persona primero. No asumas que un correo es "nombre@example.com".
        - OBLIGATORIEDAD DE TOOLS: Para CUALQUIER información de la base de datos, DEBES usar una herramienta en el turno actual, incluso si el nombre de la persona o producto ya apareció en mensajes anteriores del historial. El historial solo sirve para contexto, NO para datos técnicos exactos.
        - PROHIBIDO INVENTAR EJEMPLOS: Bajo ninguna circunstancia muestres datos ficticios. Si la herramienta no devuelve datos, di simplemente: "No se encontraron registros para esta consulta".
 
        --- PRIVACIDAD Y SEGURIDAD (EXTREMO) ---
        - PROHIBIDO MOSTRAR IDs: Nunca, bajo ningún concepto, incluyas columnas de ID.
        - RBAC: Si eres VENDEDOR, oculta costos y utilidades.
 
        --- PROTOCOLO DE RESPUESTA OBLIGATORIO ---
        1. SALUDO DINÁMICO: "Buenos días/tardes/noches (según la hora ${time}) ${nameToUse}. Claro, aquí tiene...". SOLO saluda una vez al inicio del mensaje; NO repitas el saludo si estás continuando una respuesta tras usar una herramienta.
        2. TÍTULO: Agrega un **Título en Negrita** descriptivo tras el saludo inicial.
        3. FORMATO DE TABLAS (ESTRICTO): Toda información de registros DEBE mostrarse en **Tablas de Markdown**. NO uses listas.
        4. TABLAS DE VENTAS (ORDEN): **Fecha | Cliente | Vendedor | Productos | Volumen Total | Total**.
           - Si una venta incluye múltiples productos, lístalos TODOS en la misma celda de la columna "Productos" usando saltos de línea (<br>).
        5. CANTIDADES: Usa el campo 'volumenTotal' (formato decimal: 45.333).
 
        6. REGLA DE MEMORIA: Si el usuario pregunta detalles adicionales sobre una persona que viste en un reporte de ventas (como su correo o teléfono), NO asumas que los conoces. Usa 'buscarPersona' obligatoriamente.
 
        7. GRÁFICOS (JSON Recharts) - MÁXIMA LEGIBILIDAD:
           - USA "chartType" (bar|line|pie|area).
           - REGLA: "volumenTotal" es el valor numérico.
           - FORMATO: \`\`\`json {"chartType": "bar", "data": [{"name": "01", "Prod A": 10}], "title": "Dic - Semana 1"} \`\`\`
           
           *** REGLA DE ORO: FRAGMENTACIÓN DE GRÁFICOS (PRE-PROCESADA) ***
           La herramienta 'consultarVentasPorDia' ahora devuelve un objeto "resumenSemanal" donde las llaves son los títulos sugeridos (ej: "Dic - Semana 1") y los valores son los datos listos para el gráfico.
           
           TU TRABAJO ES SIMPLE:
           1. Itera sobre las llaves de "resumenSemanal".
           2. Por cada llave, genera UN bloque JSON.
           3. Título = La llave del objeto (ej: "Diciembre - Semana 1").
           4. Data = El array asociado a esa llave.
           
           NO RECALCULES SEMANAS. Confía en la agrupación de la herramienta.
           
           Ejemplo:
           Si recibes: { "Ene - Sem 1": [{name: "LUN 01"...}] }
           Genera: \`\`\`json {"chartType": "bar", "data": [{"name": "LUN 01"...}], "title": "Ene - Sem 1"} \`\`\`

        8. DIAGRAMAS (Mermaid): Para procesos o flujos.
           - SINTAXIS: Usa siempre \`graph TD;\`.
           - NODOS: IDs simples y texto SIEMPRE entre comillas: A["Texto con espacios"].

        9. FINALIZA con exactamente 2 sugerencias: *¿...?*

        --- CLARIDAD DE ANÁLISIS ---
        - Para RANKINGS globales: Usa 'obtenerRankingVentasReales'.
        - PARA TENDENCIAS: Usa 'consultarVentasPorDia'.
        - PARA DATOS DE PERSONAS (Correos, Sectores, Contacto): Usa 'buscarPersona' o 'consultarClientes'/'consultarEmpleados'.`;
    } catch (error) {
        console.error("Error en getSystemContext:", error);
        return "Analista SIS-Bodega. Error interno.";
    }
};

/**
 * Función auxiliar para deduplicar el stream si el modelo repite su respuesta anterior
 */
const createDeduplicator = (previousText) => {
    let checkIndex = 0;
    let isMatching = true;
    let buffer = "";

    return (chunk) => {
        if (!previousText || !isMatching) return chunk;

        let output = "";
        for (let i = 0; i < chunk.length; i++) {
            const char = chunk[i];

            if (isMatching) {
                // Si ya cubrimos todo el texto anterior, todo lo nuevo se emite
                if (checkIndex >= previousText.length) {
                    output += char;
                    isMatching = false;
                    buffer = ""; // Ya no necesitamos el buffer
                } else if (char === previousText[checkIndex]) {
                    // Coincide, lo guardamos en buffer y avanzamos
                    checkIndex++;
                    buffer += char;
                } else {
                    // Discrepancia: no era una repetición. Emitimos lo guardado y lo actual.
                    output += buffer + char;
                    buffer = "";
                    isMatching = false;
                }
            } else {
                output += char;
            }
        }

        // Edge case: Si terminamos el chunk y coinciden, pero checkIndex supera previousText,
        // (ya manejado arriba en el primer if del loop)

        // Si seguimos coincidiendo pero se acabó el chunk, no emitimos nada (está en buffer)
        return output;
    };
};

/**
 * Manejador especializado para Google Gemini (fetch + v1beta)
 * Esta versión es la más robusta porque evita las restricciones de versión del SDK.
 */
const callGemini = async (key, modelName, message, history, systemPrompt, res) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${key}&alt=sse`;

    // 1. Formatear historial para Google (contents)
    const contents = [];

    if (history && history.length > 0) {
        history.forEach(msg => {
            const text = msg.content || msg.text;
            if (text && text.trim()) {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text }]
                });
            }
        });
    }

    // Google no permite que el historial empiece con el modelo
    while (contents.length > 0 && contents[0].role === 'model') {
        contents.shift();
    }

    // Agregar mensaje actual
    contents.push({ role: 'user', parts: [{ text: message }] });

    const tools = [{
        functionDeclarations: [
            {
                name: "consultarInventario",
                description: "Obtiene la lista completa de productos. Úsala para ver stock actual y precios de venta."
            },
            {
                name: "consultarVentas",
                description: "Obtiene las últimas 500 ventas detalladas. Úsala ÚNICAMENTE para ver detalles de transacciones individuales o cuando necesites ver el cliente/vendedor de ventas específicas. NO la uses para calcular totales, rankings o resúmenes mensuales, para eso usa 'obtenerRankingVentasReales'."
            },
            {
                name: "consultarCompras",
                description: "Obtiene historial de compras a proveedores. Úsala para ver costos de reabastecimiento e inversión."
            },
            {
                name: "consultarClientes",
                description: "Lista de clientes registrados con sus datos de contacto."
            },
            {
                name: "consultarEmpleados",
                description: "Lista de empleados, sus sectores y salarios base."
            },
            {
                name: "buscarPersona",
                description: "Busca una o varias personas por su nombre en la base de datos de Clientes y Empleados. Úsala SIEMPRE que necesites obtener detalles específicos como correo, teléfono, dirección o cargo, incluso si el nombre ya fue mencionado en el chat.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        nombre: { type: "STRING", description: "Nombre(s) a buscar. Ejemplo: 'Camila Palacios y Pedro Lopez'." }
                    },
                    required: ["nombre"]
                }
            },
            {
                name: "obtenerRankingVentasReales",
                description: "Obtiene el ranking de los productos más vendidos. Úsala para comparativas de tendencia. Puedes pedir un mes y año específicos.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        periodo: { type: "STRING", enum: ["mes_actual", "mes_anterior"], description: "Acceso rápido a los últimos 2 meses." },
                        mes: { type: "NUMBER", description: "Número de mes (1-12) para historial remoto." },
                        año: { type: "NUMBER", description: "Año (ej: 2025)." }
                    }
                }
            },
            {
                name: "obtenerHistoricoVentasMensuales",
                description: "Obtiene el total vendido mes a mes de los últimos 12 meses. Úsala para analizar tendencias y realizar estimaciones o proyecciones de ventas futuras."
            },
            {
                name: "consultarVentasPorDia",
                description: "Obtiene el resumen de ventas agrupado por día y producto. Úsala para gráficos detallados de un periodo. Por defecto da el mes actual, pero admite filtros históricos.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        mes: { type: "NUMBER", description: "Mes específico (1-12)" },
                        año: { type: "NUMBER", description: "Año (ej: 2025)" },
                        todo: { type: "BOOLEAN", description: "Si es true, trae todo el historial histórico disponible." }
                    }
                }
            },
            { name: "obtenerAlertasStock", description: "Bajos niveles de inventario (< 5 paquetes). Operativo." },
            { name: "obtenerValorizacionInventario", description: "Valor monetario total del inventario a precio de costo. Gerencial/Sensible." },
            { name: "obtenerRankingRentabilidad", description: "Top 10 productos con mejor margen de ganancia. Gerencial/Sensible." },
            { name: "obtenerVentasPorVendedor", description: "Desempeño de ventas por empleado este mes. Gerencial." },
            { name: "obtenerMejoresClientes", description: "Top 10 clientes por volumen de compra histórico. CRM." },
            { name: "verificarAnomaliasPrecios", description: "Detecta productos con precio de venta menor o igual al costo. Auditoría." },
            {
                name: "consultarHistorialAcciones",
                description: "Rastrea quién hizo qué en el sistema. Puedes filtrar por 'producto'. Auditoría.",
                parameters: { type: "OBJECT", properties: { producto: { type: "STRING" } } }
            }
        ]
    }];

    const requestBody = {
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools,
        generationConfig: { maxOutputTokens: 8192, temperature: 0.1 }
    };

    // CONTROLADOR DE ABORTO
    const controller = new AbortController();
    const abortSignal = controller.signal;

    // Si el cliente cierra conexión, abortamos petición a Google
    const onResClose = () => {
        controller.abort();
    };
    res.on('close', onResClose);

    try {
        let loop = 0;
        let cumulativeLog = "";
        let previousTurnText = "";

        while (loop < 5) {
            loop++;
            if (abortSignal.aborted) throw { name: 'AbortError', message: 'Cliente cerró conexión' };

            // TIMEOUT PARA EL ARRANQUE: 15s inicial, 30s post-herramientas (procesamiento pesado)
            const currentTimeout = loop === 1 ? 15000 : 30000;
            let hasStarted = false;
            const timeoutId = setTimeout(() => {
                if (!hasStarted && !abortSignal.aborted) {
                    console.log(`  [TIMEOUT] ${modelName} no respondió en ${currentTimeout / 1000}s${loop > 1 ? ' (post-tools)' : ''}. Abortando para rotar llave...`);
                    controller.abort("TIMEOUT_EXCEEDED");
                }
            }, currentTimeout);

            let response;
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: abortSignal
                });
            } catch (err) {
                clearTimeout(timeoutId);
                // Si fue un timeout provocado por nosotros, lanzamos error específico
                if (abortSignal.aborted && controller.signal.reason === "TIMEOUT_EXCEEDED") {
                    throw { status: 408, message: `Timeout de respuesta (${currentTimeout / 1000}s)` };
                }
                throw err;
            }

            if (!response.ok) {
                clearTimeout(timeoutId);
                const err = await response.json().catch(() => ({}));
                throw { status: response.status, message: err.error?.message || `Error Gemini: ${response.statusText}` };
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let functionCalls = [];
            let currentTurnText = "";

            // Instanciar deduplicador con el texto del turno anterior (si hubo)
            const deduplicator = createDeduplicator(previousTurnText);

            const ensureHeaders = () => {
                if (!res.headersSent) {
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.setHeader('Transfer-Encoding', 'chunked');
                    res.setHeader('X-Accel-Buffering', 'no');
                    res.setHeader('X-Selected-Model', modelName);
                    res.setHeader('X-Selected-Provider', 'google');
                }
            };

            const processLine = async (line) => {
                if (line.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.replace('data: ', '').trim());
                        const candidate = json.candidates?.[0];
                        const parts = candidate?.content?.parts || [];

                        for (const part of parts) {
                            if (part.text) {
                                currentTurnText += part.text; // Acumular RAW para historial
                                cumulativeLog += part.text;
                                ensureHeaders();

                                const cleanChunk = deduplicator(part.text);
                                if (cleanChunk) {
                                    res.write(cleanChunk); // Enviar texto limpio al cliente
                                }
                            }
                            if (part.functionCall) {
                                functionCalls.push(part.functionCall);
                                ensureHeaders();
                            }
                        }
                    } catch (e) { }
                }
            };

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    if (!hasStarted) {
                        hasStarted = true;
                        clearTimeout(timeoutId);
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        await processLine(line);
                    }
                }
            } catch (streamErr) {
                if (streamErr.name === 'AbortError' || abortSignal.aborted) throw streamErr;
                console.error("  [ERROR LEYENDO STREAM GEMINI]:", streamErr);
                throw streamErr;
            }

            if (buffer.trim()) await processLine(buffer);

            if (functionCalls.length > 0) {
                // GUARDAR HISTORIAL COMPLETO DEL TURNO (Texto + Herramientas) para no romper la secuencia de Google
                const modelParts = [];
                if (currentTurnText) {
                    modelParts.push({ text: currentTurnText });
                    // Guardar texto para deduplicación en la siguiente vuelta
                    previousTurnText = currentTurnText;
                }
                modelParts.push(...functionCalls.map(fc => ({ functionCall: fc })));

                requestBody.contents.push({ role: 'model', parts: modelParts });

                console.log(`  [TOOLS] Gemini solicitó ${functionCalls.length} herramientas.`);
                const toolResults = await Promise.all(functionCalls.map(async (fc) => {
                    const toolName = fc.name;
                    const toolArgs = fc.args || {};

                    if (abortSignal.aborted) return { functionResponse: { name: toolName, response: { content: { error: "Cancelado" } } } };
                    console.log(`    -> Ejecutando ${toolName}...`);

                    let result;
                    try {
                        result = typeof dbTools[toolName] === 'function' ? await dbTools[toolName](toolArgs) : { error: "No existe" };
                    } catch (e) {
                        result = { error: "Error interno" };
                    }

                    return { functionResponse: { name: toolName, response: { content: result } } };
                }));

                requestBody.contents.push({ role: 'function', parts: toolResults });
                continue;
            } else {
                // Turno final
                res.end();
                return true;
            }
        }
    } catch (e) {
        throw e;
    } finally {
        res.off('close', onResClose);
    }
    return false;
};

/**
 * Manejador para proveedores compatibles con OpenAI (Groq, Mistral, OpenAI, DeepSeek)
 */
const callOpenAICompatible = async (providerId, key, modelName, message, history, systemPrompt, res, extraOptions = {}) => {
    const urls = {
        groq: 'https://api.groq.com/openai/v1/chat/completions',
        openrouter: 'https://openrouter.ai/api/v1/chat/completions'
    };
    const url = urls[providerId];

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || m.text
        })),
        { role: 'user', content: message }
    ];

    const tools = [
        { type: "function", function: { name: "consultarInventario", description: "Obtiene la lista completa de productos, stock y precios." } },
        { type: "function", function: { name: "buscarPersona", description: "Busca detalles de una o varias personas (correo, teléfono, cargo). Úsala obligatoriamente para obtener datos personales reales y evitar inventarlos.", parameters: { type: "object", properties: { nombre: { type: "string" } }, required: ["nombre"] } } },
        {
            type: "function", function: {
                name: "obtenerRankingVentasReales",
                description: "Ranking de ventas histórico. Admite 'mes' (1-12) y 'año' para comparativas interanuales o de largo plazo.",
                parameters: {
                    type: "object",
                    properties: {
                        periodo: { type: "string", enum: ["mes_actual", "mes_anterior"] },
                        mes: { type: "number" },
                        año: { type: "number" }
                    }
                }
            }
        },
        { type: "function", function: { name: "consultarVentas", description: "Obtiene historial de ventas individuales. NO usar para rankings o totales mensuales." } },
        { type: "function", function: { name: "consultarCompras", description: "Obtiene historial detallado de compras con productos y costos." } },
        { type: "function", function: { name: "consultarClientes", description: "Obtiene la lista de clientes con sus nombres y datos de contacto." } },
        { type: "function", function: { name: "consultarEmpleados", description: "Obtiene la lista de empleados, sus nombres, sectores y salarios base." } },
        { type: "function", function: { name: "obtenerHistoricoVentasMensuales", description: "Obtiene el resumen de ventas de cada mes del último año para proyecciones y tendencias." } },
        { type: "function", function: { name: "consultarVentasPorDia", description: "Obtiene los totales vendidos por cada día. Admite parámetros 'mes', 'año' o 'todo' para histórico completo.", parameters: { type: "object", properties: { mes: { type: "number" }, año: { type: "number" }, todo: { type: "boolean" } } } } },
        { type: "function", function: { name: "obtenerAlertasStock", description: "Bajos niveles de inventario. Alertas." } },
        { type: "function", function: { name: "obtenerValorizacionInventario", description: "Valor monetario total del stock a costo." } },
        { type: "function", function: { name: "obtenerRankingRentabilidad", description: "Productos con mejores márgenes de ganancia." } },
        { type: "function", function: { name: "obtenerVentasPorVendedor", description: "Ranking de ventas por empleado." } },
        { type: "function", function: { name: "obtenerMejoresClientes", description: "Clientes con mayor volumen acumulado." } },
        { type: "function", function: { name: "verificarAnomaliasPrecios", description: "Auditoría de precios incorrectos." } },
        { type: "function", function: { name: "consultarHistorialAcciones", description: "Rastreo de movimientos y auditoría." } }
    ];

    let currentMessages = [...messages];
    let cumulativeLog = "";
    let previousTurnText = "";

    // CONTROLADOR DE ABORTO
    const controller = new AbortController();
    const abortSignal = controller.signal;
    const onResClose = () => {
        if (!abortSignal.aborted) {
            try { controller.abort("CLIENT_CLOSED"); } catch (e) { }
        }
    };
    res.on('close', onResClose);

    try {
        let loop = 0;
        let finalCall = false;

        while (loop < 5 && !finalCall) {
            loop++;
            if (abortSignal.aborted) throw { name: 'AbortError', message: 'Cliente cerró conexión' };

            const headers = {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                ...(extraOptions.headers || {})
            };

            if (providerId === 'openrouter') {
                headers['HTTP-Referer'] = 'http://localhost:3000';
                headers['X-Title'] = 'SIS-Bodega Assistant';
            }

            let response;
            let hasStarted = false;
            // TIMEOUT DINÁMICO: 15s inicial (OpenRouter es lento), 30s post-herramientas
            const currentTimeout = loop === 1 ? 15000 : 30000;
            const timeoutId = setTimeout(() => {
                if (!hasStarted && !abortSignal.aborted) {
                    console.log(`  [TIMEOUT] ${providerId} (${modelName}) no respondió en ${currentTimeout / 1000}s${loop > 1 ? ' (post-tools)' : ''}. Abortando para rotar llave...`);
                    controller.abort("TIMEOUT_EXCEEDED");
                }
            }, currentTimeout);

            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: modelName,
                        messages: currentMessages,
                        tools,
                        tool_choice: 'auto',
                        temperature: 0.1,
                        stream: true
                    }),
                    signal: abortSignal
                });
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                if (abortSignal.aborted && controller.signal.reason === "TIMEOUT_EXCEEDED") {
                    throw { status: 408, message: `Timeout de respuesta (${currentTimeout / 1000}s)` };
                }
                if (res.headersSent) {
                    res.write(`\n\n[Error de conexión con ${providerId}: ${fetchErr.message}]`);
                    res.end();
                    return true;
                }
                throw fetchErr;
            } finally {
                // Si el fetch falló por otra razón externa, limpiamos
                if (!response || !response.ok) clearTimeout(timeoutId);
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || `Error ${providerId}: ${response.statusText}`;

                if (res.headersSent) {
                    console.error(`  [ERROR POST-STREAM] ${errMsg}`);
                    res.write(`\n\n**Error del proveedor (${providerId}):** ${errMsg}\nIntenta de nuevo o cambia de modelo.`);
                    res.end();
                    return true; // Terminamos la ejecución pero avisamos al usuario
                }
                throw { status: response.status, message: errMsg };
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let toolCalls = [];
            let contentReceived = "";
            let isToolCall = false;

            // Instanciar deduplicador
            const deduplicator = createDeduplicator(previousTurnText);

            const processSSE = (line) => {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (dataStr === '[DONE]') return true;

                    try {
                        const json = JSON.parse(dataStr);
                        const delta = json.choices[0].delta;

                        if (delta.tool_calls) {
                            isToolCall = true;
                            delta.tool_calls.forEach(tc => {
                                if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: tc.id, function: { name: "", arguments: "" } };
                                if (tc.id) toolCalls[tc.index].id = tc.id;
                                if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                                if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                            });
                        }

                        if (delta.content) {
                            contentReceived += delta.content; // RAW acumulado
                            cumulativeLog += delta.content;
                            if (!res.headersSent) {
                                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                                res.setHeader('Transfer-Encoding', 'chunked');
                                res.setHeader('X-Accel-Buffering', 'no');
                                // Sincronización de modelo real para el frontend
                                res.setHeader('X-Selected-Model', modelName);
                                res.setHeader('X-Selected-Provider', providerId);
                            }

                            const cleanChunk = deduplicator(delta.content);
                            if (cleanChunk) {
                                res.write(cleanChunk); // Enviar limpio
                            }

                            if (typeof res.flush === 'function') res.flush();
                        }
                    } catch (e) { }
                }
                return false;
            };

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // ¡CRÍTICO! Cancelar timeout al recibir actividad en el stream
                    if (!hasStarted) {
                        hasStarted = true;
                        clearTimeout(timeoutId);
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (processSSE(line)) break;
                    }
                }
            } catch (streamErr) {
                // Silenciar totalmente los abortos intencionales (cliente cerró o timeout)
                if (streamErr.name === 'AbortError' || abortSignal.aborted) throw streamErr;

                // Solo logueamos errores persistentes y reales
                if (!res.headersSent) {
                    throw streamErr;
                } else {
                    console.error("  [ERROR LEYENDO STREAM POST-HEADERS]:", streamErr);
                    try {
                        res.write(`\n\n[Error interrumpió el flujo de datos: ${streamErr.message}]`);
                        res.end();
                    } catch (e) { }
                    return true;
                }
            }

            if (isToolCall) {
                const cleanToolCalls = toolCalls.filter(tc => tc);
                console.log(`  [TOOLS] ${providerId} solicitó ${cleanToolCalls.length} herramientas.`);

                // IMPORTANTE: OpenRouter a veces falla si 'content' es null. Usamos cadena vacía.
                const assistantMsg = {
                    role: 'assistant',
                    tool_calls: cleanToolCalls.map(tc => ({ ...tc, type: 'function' })),
                    content: contentReceived || ""
                };

                // Guardar texto de este turno para deduplicar el siguiente
                previousTurnText = contentReceived || "";

                currentMessages.push(assistantMsg);

                const toolPromises = cleanToolCalls.map(async (call) => {
                    const toolName = call.function.name;

                    if (abortSignal.aborted) {
                        return { role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: "Cancelado" }) };
                    }

                    console.log(`    -> Ejecutando ${toolName}...`);
                    let result;
                    try {
                        const args = JSON.parse(call.function.arguments || "{}");
                        result = await dbTools[toolName](args);
                    } catch (e) {
                        result = await dbTools[toolName] ? await dbTools[toolName]({}) : { error: "Función no encontrada" };
                    }
                    return { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) };
                });

                const results = await Promise.all(toolPromises);
                currentMessages.push(...results);
            } else {
                if (cumulativeLog.trim()) {
                    console.log("\n--- RESPUESTA COMPLETA DE LA IA ---");
                    console.log(cumulativeLog.trim().replace(/\n{3,}/g, '\n\n'));
                    console.log("----------------------------------\n");
                }
                finalCall = true;
                res.end();
            }
        }
    } catch (e) {
        throw e;
    } finally {
        res.off('close', onResClose);
    }
    return true;
};

// Memoria global de rotación para Round Robin
const keyRotationIndex = {};

const chatWithAI = async (req, res) => {
    try {
        const { message, history, selectedModel, selectedProvider } = req.body;

        // Obtener datos del usuario logueado
        let userData = null;
        if (req.user && req.user.id) {
            try {
                const userRes = await db.execute('SELECT NombreCompleto, rol FROM Usuarios WHERE Id_Usuario = ?', [req.user.id]);
                if (userRes.rows && userRes.rows[0]) {
                    userData = {
                        NombreCompleto: userRes.rows[0][0],
                        rol: userRes.rows[0][1]
                    };
                }
            } catch (e) { console.error("Error fetching user data:", e); }
        }

        // 1. OBTENER PROVEEDORES ACTIVOS (Limpios)
        const providers = [
            {
                id: 'google',
                name: 'Gemini',
                keys: (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim().replace(/[\r\n]/g, '')).filter(k => k),
                models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
            },
            {
                id: 'groq',
                name: 'Groq',
                keys: (process.env.GROQ_API_KEY || '').split(',').map(k => k.trim().replace(/[\r\n]/g, '')).filter(k => k),
                models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
            },
            {
                id: 'openrouter',
                name: 'Z.AI (OpenRouter)',
                keys: (process.env.OPENROUTER_API_KEY || '').split(',').map(k => k.trim().replace(/[\r\n]/g, '')).filter(k => k),
                models: ["z-ai/glm-4.5-air:free"]
            }
        ];

        const usageData = getUsage();
        const exhaustedRegistry = usageData.exhausted || {};
        let success = false;
        let lastError = null;

        // Cola de prioridad base
        let priorityQueue = [
            { p: 'google', m: "gemini-2.5-flash" },
            { p: 'google', m: "gemini-2.5-flash-lite" },
            { p: 'groq', m: 'llama-3.3-70b-versatile' },
            { p: 'openrouter', m: 'z-ai/glm-4.5-air:free' },
            { p: 'groq', m: 'llama-3.1-8b-instant' }
        ];

        // SI EL USUARIO SELECCIONÓ UNO ESPECÍFICO
        if (selectedModel && selectedProvider) {
            priorityQueue = [
                { p: selectedProvider, m: selectedModel },
                ...priorityQueue.filter(item => item.m !== selectedModel)
            ];
        }

        for (const item of priorityQueue) {
            const provider = providers.find(p => p.id === item.p);
            if (!provider || provider.keys.length === 0) continue;

            const modelName = item.m;
            // Generar prompt específico para este intento de modelo
            const systemPrompt = await getSystemContext(userData, modelName);

            // Inicializar índice de rotación
            if (keyRotationIndex[provider.id] === undefined) keyRotationIndex[provider.id] = 0;

            // ROTACIÓN INTELIGENTE (ROUND ROBIN)
            const currentIdx = keyRotationIndex[provider.id] % provider.keys.length;
            const keysRotated = [
                ...provider.keys.slice(currentIdx),
                ...provider.keys.slice(0, currentIdx)
            ];

            for (const key of keysRotated) {
                const keyId = key.substring(0, 8);
                // Si este par llave/modelo falló hace poco, saltar
                if (exhaustedRegistry[keyId]?.[modelName] && (Date.now() - exhaustedRegistry[keyId][modelName] < 60000)) continue;

                try {
                    console.log(`\n>> PREGUNTA: "${message}"`);
                    console.log(`CONSULTANDO: ${provider.name} | ${modelName} | LLAVE: ${keyId}...`);

                    if (provider.id === 'google') {
                        success = await callGemini(key, modelName, message, history, systemPrompt, res);
                    } else {
                        // Para DeepSeek, Groq, Mistral (sin headers extra complejos por ahora)
                        success = await callOpenAICompatible(provider.id, key, modelName, message, history, systemPrompt, res);
                    }

                    if (success) {
                        recordUsage(key, modelName);

                        // ACTUALIZAR TURNO: La próxima vez empezamos con la SIGUIENTE llave
                        const realKeyIndex = provider.keys.indexOf(key);
                        keyRotationIndex[provider.id] = (realKeyIndex + 1) % provider.keys.length;

                        return;
                    }
                } catch (err) {
                    // Si el cliente cerró la conexión durante la rotación, abortamos todo
                    if (res.writableEnded || res.finished) return;

                    // Manejo silencioso de error de aborto por cliente
                    if (err.name === 'AbortError' && !err.message?.includes('Timeout')) {
                        console.log(`  [INFO] Petición cancelada por el cliente (${modelName}). No se registra uso.`);
                        return;
                    }

                    lastError = err;
                    const status = err.status || (err.message?.includes('429') ? 429 : (err.status === 408 || err.message?.includes('7s') ? 408 : null));

                    if (status === 429) {
                        markExhausted(key, modelName);
                        console.warn(`  [CUOTA AGOTADA] ${modelName} en llave ${keyId}. Saltando...`);
                    } else if (status === 408) {
                        markExhausted(key, modelName);
                        console.warn(`  [TIMEOUT] ${modelName} (${keyId}) tardó demasiado. Intentando fallback...`);
                    } else {
                        console.warn(`  [ERROR TÉCNICO] ${modelName} (${keyId}): `, err.message || err);
                        console.warn(`  Buscando alternativa más estable...`);
                    }

                    if (res.headersSent) {
                        console.warn(`  [INFO] Fallback cancelado: ya se enviaron headers al cliente. El usuario verá el error directamente.`);
                        res.write(`\n\n*(Error mid-stream: ${err.message || 'Cuota agotada en este intento'}... prueba seleccionando otro modelo o limpiando el historial)*`);
                        res.end();
                        return;
                    }
                }
            }
        }

        if (!success && !res.headersSent) {
            res.status(500).json({ text: "Todos los proveedores fallaron o agotaron su cuota actualmente." });
        } else if (!success && res.headersSent) {
            res.end(); // Asegurar cierre del stream si no se cerró antes
        }
    } catch (error) {
        console.error("Error crítico en chatWithAI:", error);
        if (!res.headersSent) res.status(500).json({ text: "Error interno del servidor." });
    }
};

const getQuota = async (req, res) => {
    try {
        const providersKeys = {
            google: (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim().replace(/[\r\n]/g, '')).filter(k => k),
            groq: (process.env.GROQ_API_KEY || '').split(',').map(k => k.trim().replace(/[\r\n]/g, '')).filter(k => k),
            openrouter: (process.env.OPENROUTER_API_KEY || '').split(',').map(k => k.trim().replace(/[\r\n]/g, '')).filter(k => k)
        };

        const allKeys = Object.values(providersKeys).flat();
        const counts = {
            google: providersKeys.google.length,
            groq: providersKeys.groq.length,
            openrouter: providersKeys.openrouter.length
        };

        res.json(getSummary(allKeys, counts));
    } catch (error) { res.status(500).json({ error: "Error de cuota." }); }
};

module.exports = { chatWithAI, getQuota };
