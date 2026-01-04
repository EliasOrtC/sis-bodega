const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const compression = require('compression');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",  // Permitir todas las origins para depurar
    methods: ["GET", "POST"]
  }
});
const PORT = 5001;

app.use(cors());
app.use(express.json());
app.use(compression());

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.execute('SELECT * FROM Usuarios WHERE NUsuario = ?', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user[3]); // password is index 2
    if (!isValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    res.json({ message: 'Login exitoso', user: { id: user[0], username: user[2] } });
  } catch (error) {
    console.error('Error durante el inicio de sesión:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.get('/clientes', async (req, res) => {
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
});

app.get('/empleados', async (req, res) => {
  try {
    const result =
    await db.execute('SELECT e.Id_Empleado, e.Nombres, e.Apellidos, e.EstadoCivil, e.Sexo, e.FechaDeNacimiento, e.FechaDeInicioContrato, e.FechaDeFinContrato, e.Ruc, e.NumCedula, e.NumInss, e.Estado, e.Sector, e.Id_Supervisor, p.Nombres AS SupervisorNombres, p.Apellidos AS SupervisorApellidos, e.SalarioBase FROM Empleados e LEFT JOIN Empleados p ON e.Id_Supervisor = p.Id_Empleado');

    const data = result.rows.map(row => ({
      id: row[0],
      nombres: row[1],
      apellidos: row[2],
      estadoCivil: row[3],
      sexo: row[4],
      fechaDeNacimiento: row[5],
      fechaDeInicioContrato: row[6],
      fechaDeFinContrato: row[7],
      ruc: row[8],
      numCedula: row[9],
      numInss: row[10],
      estado: row[11],
      sector: row[12],
      supervisor: row[13] ? {
        id: row[13],
        nombres: row[14],
        apellidos: row[15]
      } : null,
      salarioBase: row[16]
    }));

/*     const result2 = await db.execute('SELECT * FROM Nomina');
    const data2 = result2.rows.map(row => ({
      id: row[0],
      fechaActual: row[1],
      id_empleado: row[2],
      totalHorasLaboradas: row[3],
      salarioBase: row[4],
      antiguedad: row[5],
      horasExtras: row[6],
      comisionesPorVentas: row[7],
      riesgoLaboral: row[8],
      salarioBruto: row[9],
      inssLaboral: row[10],
      ir: row[11],
      comedor: row[12],
      anticipo: row[13],
      cuotaSindical: row[14],
      totalDeducciones: row[15],
      salarioNeto: row[16],
      inssPatronal: row[17],
      inatec: row[18],
      vacaciones: row[19],
      aguinaldo: row[20],
      indemnizacion: row[21]
    })); */
    res.json(data);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Error fetching employees data' });
  }
});

app.get('/ventas', async (req, res) => {
  try {
    const result = await db.execute('SELECT v.Id_Venta, v.Id_Empleado, v.Id_Cliente, v.FechaRegistro, v.TotalVenta, e.Nombres AS EmpleadoNombres, e.Apellidos AS EmpleadoApellidos, c.Nombres AS ClienteNombres, c.Apellidos AS ClienteApellidos FROM Ventas v INNER JOIN Empleados e ON v.Id_Empleado = e.Id_Empleado INNER JOIN Clientes c ON v.Id_Cliente = c.Id_Cliente');
    const data = result.rows.map(row => ({
      id: row[0],
      empleado: {
        id: row[1],
        nombres: row[5],
        apellidos: row[6]
      },
      cliente: {
        id: row[2],
        nombres: row[7],
        apellidos: row[8]
      },
      fechaRegistro: row[3],
      totalVenta: row[4]
    }));

/*     const result2 = await db.execute('SELECT * FROM DetallesDeVentas');
    const data2 = result2.rows.map(row => ({
      id: row[0],
      id_venta: row[1],
      id_producto: row[2],
      cantidadPaquetes: row[3],
      cantidadUnidades: row[4],
      precioUnitario: row[5],
      subtotal: row[6],
      fechaRegistro: row[7]
    })); */

    res.json(data);
  } catch (error) {
    console.error('Error al obtener las ventas:', error);
    res.status(500).json({ error: 'Error al obtener los datos de las ventas' });
  }
});


app.get('/compras', async (req, res) => {
  try {
    const result = await db.execute('SELECT c.Id_Compra, c.FechaDeCompra, c.Id_Proveedor, c.TotalCompra, p.NombreProveedor FROM Compras c LEFT JOIN Proveedor p ON c.Id_Proveedor = p.Id_Proveedor');
    const data = result.rows.map(row => ({
      id: row[0],
      fechaDeCompra: row[1],
      id_proveedor: row[2],
      totalCompra: row[3],
      proveedor: row[4] ? {
        nombreProveedor: row[4]
      } : null
    }));

    res.json(data);
  } catch (error) {
    console.error('Error al obtener las compras:', error);
    res.status(500).json({ error: 'Error al obtener los datos de las compras' });
  }
});

app.get('/proveedores', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM Proveedor');
    const data = result.rows.map(row => ({
      id: row[0],
      nombreProveedor: row[1],
      telefono: row[2],
      direccion: row[3]
    }));
    res.json(data);
  } catch (error) {
    console.error('Error al obtener los proveedores:', error);
    res.status(500).json({ error: 'Error al obtener los datos de los proveedores' });
  }
});

app.get('/inventario', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM Inventario');
    const data = result.rows.map(row => ({
      id: row[0],
      nombre: row[1],
      tipoPaquete: row[2],
      inventario: row[3],
      cantidadUnidades: row[4],
      cantidadPaquetes: row[5],
      precioVenta_Paq: row[6],
      precioCompra_Paq: row[7]
    }));
    res.json(data);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Error fetching inventory data' });
  }
});


io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', socket.id, 'Reason:', reason);
  });
});

// Función para notificar cambios en empleados
const notificarEmpleadosActualizados = () => {
  io.emit('EmpleadosActualizados');
  io.emit('employeesUpdated');
};

// Función para notificar cambios en compras
const notificarComprasActualizadas = () => {
  io.emit('ComprasActualizadas');
  io.emit('purchasesUpdated');
};

// Función para notificar cambios en inventario
const notificarInventarioActualizado = () => {
  io.emit('InventarioActualizado');
  io.emit('inventoryUpdated');
};

// Función para notificar cambios en ventas
const notificarVentasActualizadas = () => {
  io.emit('VentasActualizadas');
  io.emit('ventasUpdated');
};

// Función para notificar cambios en clientes
const notificarClientesActualizados = () => {
  io.emit('ClientesActualizados');
  io.emit('clientsUpdated');
};



// Endpoint para agregar ventas
app.post('/ventas', async (req, res) => {
  try {
    const { id_empleado, id_cliente, fechaRegistro, totalVenta } = req.body;
    await db.execute('INSERT INTO Ventas (Id_Empleado, Id_Cliente, FechaRegistro, TotalVenta) VALUES (?, ?, ?, ?)', [id_empleado, id_cliente, fechaRegistro, totalVenta]);
    notificarVentasActualizadas(); // Notificar a todos los clientes conectados
    res.status(201).json({ message: 'Venta agregada correctamente' });
  } catch (error) {
    console.error('Error adding sale:', error);
    res.status(500).json({ error: 'Error al agregar la venta' });
  }
});

// Endpoint para agregar clientes
app.post('/clientes', async (req, res) => {
  try {
    const { nombres, apellidos, correo, telefono, fechaRegistro, numCedula, direccion } = req.body;
    await db.execute('INSERT INTO Clientes (Nombres, Apellidos, Correo, Telefono, FechaRegistro, NumCedula, Direccion) VALUES (?, ?, ?, ?, ?, ?, ?)', [nombres, apellidos, correo, telefono, fechaRegistro, numCedula, direccion]);
    notificarClientesActualizados(); // Notificar a todos los clientes conectados
    res.status(201).json({ message: 'Cliente agregado correctamente' });
  } catch (error) {
    console.error('Error adding client:', error);
    res.status(500).json({ error: 'Error al agregar el cliente' });
  }
});

// Endpoint para agregar empleados
app.post('/empleados', async (req, res) => {
  try {
    const { nombres, apellidos, estadoCivil, sexo, fechaDeNacimiento, fechaDeInicioContrato, fechaDeFinContrato, ruc, numCedula, numInss, estado, sector, supervisor, salarioBase } = req.body;
    await db.execute('INSERT INTO Empleados (Nombres, Apellidos, EstadoCivil, Sexo, FechaDeNacimiento, FechaDeInicioContrato, FechaDeFinContrato, RUC, NumCedula, NumInss, Estado, Sector, Supervisor, SalarioBase) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [nombres, apellidos, estadoCivil, sexo, fechaDeNacimiento, fechaDeInicioContrato, fechaDeFinContrato, ruc, numCedula, numInss, estado, sector, supervisor, salarioBase]);
    notificarEmpleadosActualizados(); // Notificar a todos los clientes conectados
    res.status(201).json({ message: 'Empleado agregado correctamente' });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ error: 'Error al agregar el empleado' });
  }
});

// Endpoint para agregar compras
app.post('/compras', async (req, res) => {
  try {
    const { fechaDeCompra, id_proveedor, totalCompra } = req.body;
    await db.execute('INSERT INTO Compras (FechaDeCompra, Id_Proveedor, TotalCompra) VALUES (?, ?, ?)', [fechaDeCompra, id_proveedor, totalCompra]);
    notificarComprasActualizadas(); // Notificar a todos los clientes conectados
    res.status(201).json({ message: 'Compra agregada correctamente' });
  } catch (error) {
    console.error('Error adding purchase:', error);
    res.status(500).json({ error: 'Error al agregar la compra' });
  }
});

// Endpoint para agregar inventario
app.post('/inventario', async (req, res) => {
  try {
    const { nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq } = req.body;
    await db.execute('INSERT INTO Inventario (Nombre, TipoPaquete, Inventario, CantidadUnidades, CantidadPaquetes, PrecioVenta_Paq, PrecioCompra_Paq) VALUES (?, ?, ?, ?, ?, ?, ?)', [nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq]);
    notificarInventarioActualizado(); // Notificar a todos los clientes conectados
    res.status(201).json({ message: 'Producto agregado al inventario correctamente' });
  } catch (error) {
    console.error('Error adding inventory:', error);
    res.status(500).json({ error: 'Error al agregar el producto al inventario' });
  }
});




// Endpoints para editar
app.put('/ventas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_empleado, id_cliente, fechaRegistro, totalVenta } = req.body;
    await db.execute('UPDATE Ventas SET Id_Empleado = ?, Id_Cliente = ?, FechaRegistro = ?, TotalVenta = ? WHERE Id_Venta = ?', [id_empleado, id_cliente, fechaRegistro, totalVenta, id]);
    notificarVentasActualizadas();
    res.json({ message: 'Venta actualizada correctamente' });
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ error: 'Error al actualizar la venta' });
  }
});

app.put('/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, correo, telefono, fechaRegistro, numCedula, direccion } = req.body;
    await db.execute('UPDATE Clientes SET Nombres = ?, Apellidos = ?, Correo = ?, Telefono = ?, FechaRegistro = ?, NumCedula = ?, Direccion = ? WHERE Id_Cliente = ?', [nombres, apellidos, correo, telefono, fechaRegistro, numCedula, direccion, id]);
    notificarClientesActualizados();
    res.json({ message: 'Cliente actualizado correctamente' });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Error al actualizar el cliente' });
  }
});

app.put('/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, estadoCivil, sexo, fechaDeNacimiento, fechaDeInicioContrato, fechaDeFinContrato, ruc, numCedula, numInss, estado, sector, Supervisor, salarioBase } = req.body;
    await db.execute('UPDATE Empleados SET Nombres = ?, Apellidos = ?, EstadoCivil = ?, Sexo = ?, FechaDeNacimiento = ?, FechaDeInicioContrato = ?, FechaDeFinContrato = ?, RUC = ?, NumCedula = ?, NumInss = ?, Estado = ?, Sector = ?, Id_Supervisor = ?, SalarioBase = ? WHERE Id_Empleado = ?', [nombres, apellidos, estadoCivil, sexo, fechaDeNacimiento, fechaDeInicioContrato, fechaDeFinContrato, ruc, numCedula, numInss, estado, sector, Supervisor, salarioBase, id]);
    notificarEmpleadosActualizados();
    res.json({ message: 'Empleado actualizado correctamente' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Error al actualizar el empleado' });
  }
});

app.put('/compras/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fechaDeCompra, id_proveedor, totalCompra } = req.body;
    await db.execute('UPDATE Compras SET FechaDeCompra = ?, Id_Proveedor = ?, TotalCompra = ? WHERE Id_Compra = ?', [fechaDeCompra, id_proveedor, totalCompra, id]);
    notificarComprasActualizadas();
    res.json({ message: 'Compra actualizada correctamente' });
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(500).json({ error: 'Error al actualizar la compra' });
  }
});

app.put('/inventario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq } = req.body;
    await db.execute('UPDATE Inventario SET Nombre = ?, TipoPaquete = ?, Inventario = ?, CantidadUnidades = ?, CantidadPaquetes = ?, PrecioVenta_Paq = ?, PrecioCompra_Paq = ? WHERE Id_Producto = ?', [nombre, tipoPaquete, inventario, cantidadUnidades, cantidadPaquetes, precioVenta_Paq, precioCompra_Paq, id]);
    notificarInventarioActualizado();
    res.json({ message: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});