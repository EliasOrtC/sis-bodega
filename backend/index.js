const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const compression = require('compression');
const scanner = require('./utils/socketNotifier');

// Routes
const authRoutes = require('./routes/authRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const empleadosRoutes = require('./routes/empleadosRoutes');
const ventasRoutes = require('./routes/ventasRoutes');
const comprasRoutes = require('./routes/comprasRoutes');
const proveedoresRoutes = require('./routes/proveedoresRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const statsRoutes = require('./routes/statsRoutes');
const detallesVentasRoutes = require('./routes/detallesVentasRoutes');
const historialRoutes = require('./routes/historialRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5001;

// Initialize socket notifier
scanner.init(io);

app.use(cors());
app.use(express.json());
app.use(compression());

// Register Routes
app.use('/', authRoutes);
app.use('/clientes', clientesRoutes);
app.use('/empleados', empleadosRoutes);
app.use('/ventas', ventasRoutes);
app.use('/compras', comprasRoutes);
app.use('/proveedores', proveedoresRoutes);
app.use('/inventario', inventarioRoutes);
app.use('/stats', statsRoutes);
app.use('/detalles-ventas', detallesVentasRoutes);
app.use('/historial', historialRoutes);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', socket.id, 'Reason:', reason);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});