let io;

const init = (socketIoInstance) => {
    io = socketIoInstance;
};

const notify = (event) => {
    if (io) {
        io.emit(event);
        // Map old events if needed or just use the passed one
        if (event === 'VentasActualizadas') io.emit('ventasUpdated');
        if (event === 'ClientesActualizadas') io.emit('clientsUpdated');
        if (event === 'EmpleadosActualizados') io.emit('employeesUpdated');
        if (event === 'ComprasActualizadas') io.emit('purchasesUpdated');
        if (event === 'InventarioActualizado') io.emit('inventoryUpdated');
        if (event === 'DetallesVentasActualizados') io.emit('detallesVentasUpdated');
    }
};

module.exports = {
    init,
    notify,
    // Specifc ones for convenience
    notificarEmpleados: () => notify('EmpleadosActualizados'),
    notificarCompras: () => notify('ComprasActualizadas'),
    notificarInventario: () => notify('InventarioActualizado'),
    notificarVentas: () => notify('VentasActualizadas'),
    notificarClientes: () => notify('ClientesActualizados'),
    notificarDetallesVentas: () => notify('DetallesVentasActualizados')
};
