require('dotenv').config();
const { createClient } = require('@libsql/client');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Cambia esta variable a true para usar base de datos local (offline), false para Turso (online)
const USE_LOCAL_DB = process.env.NODE_ENV === 'production' ? false : true;

let db;

if (USE_LOCAL_DB) {
  const localDb = new sqlite3.Database('./local.db', (err) => {
    if (err) {
      console.error('Error al abrir la base de datos local:', err.message);
    } else {
      console.log('conectado a la base de datos SQLite local');
    }
  });

  // Wrapper para hacer sqlite3 compatible con @libsql/client
  db = {
    execute: (query, params = []) => {
      return new Promise((resolve, reject) => {
        if (query.trim().toUpperCase().startsWith('SELECT') || query.trim().toUpperCase().startsWith('PRAGMA')) {
          localDb.all(query, params, (err, rows) => {
            if (err) reject(err);
            else {
              // Convertir array de objetos a array de arrays para compatibilidad
              const convertedRows = rows.map(row => Object.values(row));
              resolve({ rows: convertedRows });
            }
          });
        } else {
          localDb.run(query, params, function (err) {
            if (err) reject(err);
            else resolve({ rows: [] }); // Para INSERT, etc., no hay rows
          });
        }
      });
    }
  };
} else {
  console.log('conectado a la base de datos en Turso');
  db = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN
  });
}

(async () => {
  try {

    await db.execute(`CREATE TABLE IF NOT EXISTS Clientes (
      Id_Cliente INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombres TEXT,
      Apellidos TEXT,
      Correo TEXT,
      Telefono TEXT,
      FechaRegistro TEXT,
      NumCedula TEXT,
      Direccion TEXT
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS Empleados (
      Id_Empleado INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombres TEXT,
      Apellidos TEXT,
      EstadoCivil TEXT,
      Sexo TEXT,
      FechaDeNacimiento TEXT,
      FechaDeInicioContrato TEXT,
      FechaDeFinContrato TEXT,
      RUC TEXT,
      NumCedula TEXT,
      NumInss TEXT,
      Estado TEXT,
      Sector TEXT,
      Id_Supervisor INTEGER,
      SalarioBase REAL DEFAULT 0,
      FOREIGN KEY (Id_Supervisor) REFERENCES Empleados(Id_Empleado)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS Nomina (
      Id_Nomina INTEGER PRIMARY KEY AUTOINCREMENT,
      FechaActual TEXT,
      Id_Empleado INTEGER,

      -- Datos base
      TotalHorasLaboradas INTEGER DEFAULT 0,
      SalarioBase REAL DEFAULT 0,
      Antiguedad REAL DEFAULT 0,
      HorasExtras REAL DEFAULT 0,
      ComisionesPorVentas REAL DEFAULT 0,

      -- Cálculos de salario
      RiesgoLaboral REAL DEFAULT 0,
      SalarioBruto REAL DEFAULT 0,

      -- Deducciones
      InssLaboral REAL DEFAULT 0,
      IR REAL DEFAULT 0,
      Comedor REAL DEFAULT 0,
      Anticipo REAL DEFAULT 0,
      CuotaSindical REAL DEFAULT 0,
      TotalDeducciones REAL DEFAULT 0,

      -- Salario neto
      SalarioNeto REAL DEFAULT 0,

      -- Aportes patronales
      InssPatronal REAL DEFAULT 0,
      Inatec REAL DEFAULT 0,

      -- Prestaciones sociales
      Vacaciones REAL DEFAULT 0,
      Aguinaldo REAL DEFAULT 0,
      Indemnizacion REAL DEFAULT 0,

      FOREIGN KEY (Id_Empleado) REFERENCES Empleados(Id_Empleado)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS Ventas (
      Id_Venta INTEGER PRIMARY KEY AUTOINCREMENT,
      Id_Empleado INTEGER,
      Id_Cliente INTEGER,
      FechaRegistro TEXT,
      TotalVenta REAL DEFAULT 0,
      FOREIGN KEY (Id_Empleado) REFERENCES Empleados(Id_Empleado),
      FOREIGN KEY (Id_Cliente) REFERENCES Clientes(Id_Cliente)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS Inventario (
      Id_Producto INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre TEXT NOT NULL,
      TipoPaquete INTEGER NOT NULL,
      Inventario REAL DEFAULT 0,
      CantidadUnidades INTEGER DEFAULT 0,
      CantidadPaquetes INTEGER DEFAULT 0,
      PrecioVenta_Paq REAL DEFAULT 0,
      PrecioCompra_Paq REAL DEFAULT 0
    )`);


    await db.execute(`CREATE TABLE IF NOT EXISTS DetallesDeVentas (
      Id_DetalleDeVenta INTEGER PRIMARY KEY AUTOINCREMENT,
      Id_Producto INTEGER NOT NULL,
      Id_Venta INTEGER NOT NULL,
      CantidadPaquetes INTEGER NOT NULL DEFAULT 0,
      CantidadUnidades INTEGER NOT NULL DEFAULT 0,
      PrecioUnitario REAL DEFAULT 0,
      Subtotal REAL DEFAULT 0,
      FOREIGN KEY (Id_Producto) REFERENCES Inventario(Id_Producto),
      FOREIGN KEY (Id_Venta) REFERENCES Ventas(Id_Venta)
    )`);


    await db.execute(`CREATE TABLE IF NOT EXISTS Proveedor(
      Id_Proveedor INTEGER PRIMARY KEY AUTOINCREMENT,
      NombreProveedor TEXT,
      Telefono INTEGER,
      Direccion TEXT
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS Compras (
      Id_Compra INTEGER PRIMARY KEY AUTOINCREMENT,
      FechaDeCompra TEXT,
      Id_Proveedor INTEGER,
      TotalCompra REAL DEFAULT 0,
      FOREIGN KEY (Id_Proveedor) REFERENCES Proveedor(Id_Proveedor)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS DetallesDeCompras (
      Id_DetalleDeCompra INTEGER PRIMARY KEY AUTOINCREMENT,
      Id_Producto INTEGER,
      Id_Compra INTEGER,
      CantidadPaquetes INTEGER NOT NULL DEFAULT 0,
      PrecioSinDescuento REAL DEFAULT 0,
      Subtotal REAL DEFAULT 0,
      DescuentoTotal REAL DEFAULT 0,
      Total REAL DEFAULT 0,
      TotalConIva REAL DEFAULT 0,
      IVA REAL DEFAULT 0,
      Descuento REAL DEFAULT 0,
      FOREIGN KEY (Id_Producto) REFERENCES Inventario(Id_Producto),
      FOREIGN KEY (Id_Compra) REFERENCES Compras(Id_Compra)
    )`);


    await db.execute(`CREATE TABLE IF NOT EXISTS Usuarios (
      Id_Usuario integer primary key AUTOINCREMENT,
      NombreCompleto text,
      NUsuario text,
      Contraseña text,
      Email text, 
      rol text
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS ResetTokens (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Id_Usuario INTEGER,
      Email TEXT NOT NULL,
      Token TEXT NOT NULL,
      Expiry TEXT NOT NULL,
      FOREIGN KEY (Id_Usuario) REFERENCES Usuarios(Id_Usuario)
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS HistorialAcciones (
      Id_Accion INTEGER PRIMARY KEY AUTOINCREMENT,
      Id_Usuario INTEGER,
      UsuarioNombre TEXT,
      Tabla TEXT,
      Accion TEXT,
      Descripcion TEXT,
      Fecha TEXT,
      FOREIGN KEY (Id_Usuario) REFERENCES Usuarios(Id_Usuario)
    )`);

    // Insertar usuario por defecto si no existe ningún usuario en la tabla
    const usersResult = await db.execute('SELECT COUNT(*) as count FROM Usuarios');
    const usersCount = (usersResult.rows && usersResult.rows[0]) ? (usersResult.rows[0][0] || usersResult.rows[0].count || 0) : 0;

    if (usersCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.execute('INSERT INTO Usuarios (NUsuario, Contraseña, rol) VALUES (?, ?, ?)', ['admin', hashedPassword, 'admin']);
      console.log('Usuario administrador inicial creado.');
    }

    console.log('Tablas creadas exitosamente');

    // --- TRIGGERS PARA EL INVENTARIO ---

    // 1. Trigger para RESTAR inventario al vender (INSERT en DetallesDeVentas)
    await db.execute(`DROP TRIGGER IF EXISTS trg_update_stock_sale`);
    await db.execute(`
      CREATE TRIGGER trg_update_stock_sale
      AFTER INSERT ON DetallesDeVentas
      BEGIN
        UPDATE Inventario
        SET
          -- Convertir todo a unidades totales para el cálculo
          -- Nueva Cantidad Total = (StockPaquetes * Tipo + StockUnidades) - (VentaPaq * Tipo + VentaUnidades)
          
          CantidadPaquetes = (
            (CantidadPaquetes * TipoPaquete + CantidadUnidades) - (NEW.CantidadPaquetes * TipoPaquete + NEW.CantidadUnidades)
          ) / TipoPaquete,
          
          CantidadUnidades = (
            (CantidadPaquetes * TipoPaquete + CantidadUnidades) - (NEW.CantidadPaquetes * TipoPaquete + NEW.CantidadUnidades)
          ) % TipoPaquete,
          
          Inventario = ROUND((CAST(
            ((CantidadPaquetes * TipoPaquete + CantidadUnidades) - (NEW.CantidadPaquetes * TipoPaquete + NEW.CantidadUnidades))
          AS REAL) / TipoPaquete),2)
          
        WHERE Id_Producto = NEW.Id_Producto;
      END;
    `);

    // 2. Trigger para SUMAR inventario al eliminar venta/editar (DELETE en DetallesDeVentas)
    await db.execute(`DROP TRIGGER IF EXISTS trg_restore_stock_delete`);
    await db.execute(`
      CREATE TRIGGER trg_restore_stock_delete
      AFTER DELETE ON DetallesDeVentas
      BEGIN
        UPDATE Inventario
        SET
          -- Nueva Cantidad Total = (StockPaquetes * Tipo + StockUnidades) + (VentaPaq * Tipo + VentaUnidades)
          
          CantidadPaquetes = (
            (CantidadPaquetes * TipoPaquete + CantidadUnidades) + (OLD.CantidadPaquetes * TipoPaquete + OLD.CantidadUnidades)
          ) / TipoPaquete,
          
          CantidadUnidades = (
            (CantidadPaquetes * TipoPaquete + CantidadUnidades) + (OLD.CantidadPaquetes * TipoPaquete + OLD.CantidadUnidades)
          ) % TipoPaquete,
          
          Inventario = ROUND((CAST(
            ((CantidadPaquetes * TipoPaquete + CantidadUnidades) + (OLD.CantidadPaquetes * TipoPaquete + OLD.CantidadUnidades))
          AS REAL) / TipoPaquete),2)
          
        WHERE Id_Producto = OLD.Id_Producto;
      END;
    `);

    // 3. Trigger para ACTUALIZAR inventario al editar cantidades o productos (UPDATE en DetallesDeVentas)
    await db.execute(`DROP TRIGGER IF EXISTS trg_update_stock_update`);
    await db.execute(`
      CREATE TRIGGER trg_update_stock_update
      AFTER UPDATE ON DetallesDeVentas
      BEGIN
        -- 1. Devolver el stock del producto anterior (OLD)
        UPDATE Inventario
        SET
          CantidadPaquetes = (
            (CantidadPaquetes * TipoPaquete + CantidadUnidades) + (OLD.CantidadPaquetes * TipoPaquete + OLD.CantidadUnidades)
          ) / TipoPaquete,
          CantidadUnidades = (
            (CantidadPaquetes * TipoPaquete + CantidadUnidades) + (OLD.CantidadPaquetes * TipoPaquete + OLD.CantidadUnidades)
          ) % TipoPaquete,
          Inventario = ROUND((CAST(
            ((CantidadPaquetes * TipoPaquete + CantidadUnidades) + (OLD.CantidadPaquetes * TipoPaquete + OLD.CantidadUnidades))
          AS REAL) / TipoPaquete),2)
        WHERE Id_Producto = OLD.Id_Producto;

        -- 2. Restar el stock del nuevo producto/cantidad (NEW)
        UPDATE Inventario
        SET
          CantidadPaquetes = (
            (CantidadPaquetes * TipoPaquete + CantidadUnidades) - (NEW.CantidadPaquetes * TipoPaquete + NEW.CantidadUnidades)
          ) / TipoPaquete,
          CantidadUnidades = (
            (CantidadPaquetes * TipoPaquete + CantidadUnidades) - (NEW.CantidadPaquetes * TipoPaquete + NEW.CantidadUnidades)
          ) % TipoPaquete,
          Inventario = ROUND((CAST(
            ((CantidadPaquetes * TipoPaquete + CantidadUnidades) - (NEW.CantidadPaquetes * TipoPaquete + NEW.CantidadUnidades))
          AS REAL) / TipoPaquete),2)
        WHERE Id_Producto = NEW.Id_Producto;
      END;
    `);

    console.log('Triggers de inventario configurados exitosamente');
  } catch (error) {
    console.error('Error al crear las tablas/triggers:', error);
  }
})();

module.exports = db;