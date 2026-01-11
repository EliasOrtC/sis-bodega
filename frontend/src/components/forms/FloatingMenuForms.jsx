import React, { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, TextField, Autocomplete, MenuItem, Typography, Button, IconButton, Badge, Popover, List, ListItem, ListItemText, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export const VentasForm = memo(({
    formData,
    setFormData,
    empleados,
    clientes,
    productos,
    cartItems,
    handleAddToCart,
    handleRemoveFromCart,
    calculateTotal,
    selectedEmpleado,
    setSelectedEmpleado,
    selectedCliente,
    setSelectedCliente,
    selectedProducto,
    setSelectedProducto,
    cantidadPaquetes,
    setCantidadPaquetes,
    cantidadUnidades,
    setCantidadUnidades,
    cartMode,
    isEdit = false
}) => {
    const [anchorEl, setAnchorEl] = useState(null);

    const handleOpenCart = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseCart = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'cart-popover' : undefined;

    // Buscar el contenedor en el header del modal (el ID depende de si es add o edit)
    const headerRoot = document.getElementById('modal-header-actions') || document.getElementById('modal-header-actions-edit');

    const cartButton = (
        <>
            <IconButton
                aria-describedby={id}
                onClick={handleOpenCart}
                className="floating-cart-button"
                sx={{ ml: 2 }}
            >
                <Badge badgeContent={cartItems.length} color="error" overlap="circular">
                    <ShoppingCartIcon sx={{ fontSize: '1.6rem' }} />
                </Badge>
            </IconButton>

            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleCloseCart}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    className: 'cart-popover-paper'
                }}
            >
                <Box className="cart-popover-content">
                    <Typography variant="h6" className="cart-popover-title">
                        Carrito de Ventas
                    </Typography>
                    <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

                    {cartItems.length === 0 ? (
                        <Typography variant="body2" sx={{ textAlign: 'center', py: 3, opacity: 0.6 }}>
                            El carrito está vacío
                        </Typography>
                    ) : (
                        <>
                            <Box className="cart-items-scroll">
                                {cartItems.map((item, index) => (
                                    <Box key={index} className="cart-popover-item">
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                {item.producto?.nombre || 'Producto'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {item.cantidadPaquetes} paq. + {item.cantidadUnidades} un.
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#4caf50' }}>
                                                ${item.subtotal.toFixed(2)}
                                            </Typography>
                                        </Box>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveFromCart(index)}
                                            sx={{ ml: 1 }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                            <Box className="cart-popover-footer">
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Total:
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#4caf50' }}>
                                    ${calculateTotal()}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Box>
            </Popover>
        </>
    );

    return (
        <>
            {/* Renderizar el botón en el header si el contenedor existe, si no, se queda oculto */}
            {headerRoot ? createPortal(cartButton, headerRoot) : null}

            <Box className="venta-section" sx={{ mb: 3, p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Información de Venta</Typography>
                <Autocomplete
                    fullWidth
                    disablePortal
                    options={empleados}
                    getOptionLabel={(option) => `${option.nombres} ${option.apellidos}`}
                    value={selectedEmpleado}
                    disabled={cartMode && !isEdit}
                    onChange={(event, newValue) => {
                        setSelectedEmpleado(newValue);
                        setFormData(prev => ({ ...prev, id_empleado: newValue ? newValue.id : '' }));
                    }}
                    renderInput={(params) => <TextField {...params} label="Empleado" margin="normal" fullWidth className="modern-input" />}
                />
                <Autocomplete
                    options={clientes}
                    disablePortal
                    getOptionLabel={(option) => `${option.nombres} ${option.apellidos}`}
                    value={selectedCliente}
                    disabled={cartMode && !isEdit}
                    onChange={(event, newValue) => {
                        setSelectedCliente(newValue);
                        setFormData(prev => ({ ...prev, id_cliente: newValue ? newValue.id : '' }));
                    }}
                    renderInput={(params) => <TextField {...params} label="Cliente" margin="normal" fullWidth className="modern-input" />}
                />
                <TextField
                    label="Fecha Registro"
                    required
                    type="date"
                    fullWidth
                    margin="normal"
                    value={formData.fechaRegistro || ''}
                    onChange={(e) => setFormData({ ...formData, fechaRegistro: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    className="modern-input"
                    disabled={cartMode && !isEdit}
                />
            </Box>

            <Box className="section-divider" sx={{ borderBottom: '2px solid rgba(255,255,255,0.2)', mb: 3 }} />

            <Box className="detalles-section">
                <Typography variant="h6" sx={{ mb: 2 }}>Detalles de Venta</Typography>
                <Autocomplete
                    fullWidth
                    disablePortal
                    options={productos}
                    getOptionLabel={(option) => `${option.nombre} - $${option.precioVenta_Paq}`}
                    value={selectedProducto}
                    onChange={(event, newValue) => setSelectedProducto(newValue)}
                    renderInput={(params) => <TextField {...params} label="Producto" margin="normal" fullWidth className="modern-input" />}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        label="Cantidad Paquetes"
                        type="number"
                        fullWidth
                        margin="normal"
                        value={cantidadPaquetes || ''}
                        onChange={(e) => setCantidadPaquetes(e.target.value)}
                        onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                        inputProps={{ min: 0 }}
                        className="modern-input"
                    />
                    <TextField
                        label="Cantidad Unidades"
                        type="number"
                        fullWidth
                        margin="normal"
                        value={cantidadUnidades || ''}
                        onChange={(e) => setCantidadUnidades(e.target.value)}
                        onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                        inputProps={{ min: 0 }}
                        className="modern-input"
                    />
                </Box>
                <Button
                    variant="contained"
                    onClick={handleAddToCart}
                    fullWidth
                    sx={{ mt: 2, mb: 3 }}
                >
                    Agregar al Carrito
                </Button>
            </Box>
        </>
    );
});


export const ClientesForm = memo(({ formData, setFormData }) => (
    <>
        <TextField label="Nombres" required fullWidth margin="normal" value={formData.nombres || ''} onChange={(e) => setFormData({ ...formData, nombres: e.target.value })} className="modern-input" />
        <TextField label="Apellidos" required fullWidth margin="normal" value={formData.apellidos || ''} onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })} className="modern-input" />
        <TextField label="Correo" required type="email" fullWidth margin="normal" value={formData.correo || ''} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="modern-input" />
        <TextField label="Teléfono" required fullWidth margin="normal" value={formData.telefono || ''} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="modern-input" />
        <TextField label="Fecha Registro" required type="date" fullWidth margin="normal" value={formData.fechaRegistro || ''} onChange={(e) => setFormData({ ...formData, fechaRegistro: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
        <TextField label="Número Cédula" required fullWidth margin="normal" value={formData.numCedula || ''} onChange={(e) => setFormData({ ...formData, numCedula: e.target.value })} className="modern-input" />
        <TextField label="Dirección" required fullWidth margin="normal" value={formData.direccion || ''} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="modern-input" />
    </>
));

export const EmpleadosForm = memo(({ formData, setFormData, supervisores, selectedSupervisor, setSelectedSupervisor }) => (
    <>
        <TextField label="Nombres" required fullWidth margin="normal" value={formData.nombres || ''} onChange={(e) => setFormData({ ...formData, nombres: e.target.value })} className="modern-input" />
        <TextField label="Apellidos" required fullWidth margin="normal" value={formData.apellidos || ''} onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })} className="modern-input" />
        <TextField label="Estado Civil" required fullWidth margin="normal" value={formData.estadoCivil || ''} onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })} className="modern-input" />
        <TextField label="Sexo" required fullWidth margin="normal" value={formData.sexo || ''} onChange={(e) => setFormData({ ...formData, sexo: e.target.value })} className="modern-input" />
        <TextField label="Fecha de Nacimiento" required type="date" fullWidth margin="normal" value={formData.fechaDeNacimiento || ''} onChange={(e) => setFormData({ ...formData, fechaDeNacimiento: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
        <TextField label="Fecha de Inicio Contrato" required type="date" fullWidth margin="normal" value={formData.fechaDeInicioContrato || ''} onChange={(e) => setFormData({ ...formData, fechaDeInicioContrato: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
        <TextField label="Fecha de Fin Contrato" required type="date" fullWidth margin="normal" value={formData.fechaDeFinContrato || ''} onChange={(e) => setFormData({ ...formData, fechaDeFinContrato: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
        <TextField label="RUC" required fullWidth margin="normal" value={formData.ruc || ''} onChange={(e) => setFormData({ ...formData, ruc: e.target.value })} className="modern-input" />
        <TextField label="Número Cédula" required fullWidth margin="normal" value={formData.numCedula || ''} onChange={(e) => setFormData({ ...formData, numCedula: e.target.value })} className="modern-input" />
        <TextField label="Número INSS" required fullWidth margin="normal" value={formData.numInss || ''} onChange={(e) => setFormData({ ...formData, numInss: e.target.value })} className="modern-input" />
        <TextField label="Estado" required fullWidth margin="normal" value={formData.estado || ''} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="modern-input" />
        <TextField label="Sector" required fullWidth margin="normal" value={formData.sector || ''} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} className="modern-input" />
        {supervisores && (
            <Autocomplete
                fullWidth
                disablePortal
                options={supervisores}
                getOptionLabel={(option) => `${option.nombres} ${option.apellidos}`}
                value={selectedSupervisor}
                onChange={(event, newValue) => {
                    setSelectedSupervisor(newValue);
                    setFormData(prev => ({ ...prev, supervisor: newValue ? newValue.id : null, Supervisor: newValue ? newValue.id : null }));
                }}
                renderInput={(params) => <TextField {...params} label="Supervisor" margin="normal" fullWidth className="modern-input" />}
            />
        )}
        <TextField label="Salario Base" required type="number" fullWidth margin="normal" value={formData.salarioBase || ''} onChange={(e) => setFormData({ ...formData, salarioBase: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
    </>
));

export const ComprasForm = memo(({ formData, setFormData, proveedores, selectedProveedor, setSelectedProveedor }) => (
    <>
        <TextField label="Fecha de Compra" required type="date" fullWidth margin="normal" value={formData.fechaDeCompra || ''} onChange={(e) => setFormData({ ...formData, fechaDeCompra: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
        <Autocomplete
            fullWidth
            disablePortal
            options={proveedores}
            getOptionLabel={(option) => option.nombreProveedor}
            value={selectedProveedor}
            onChange={(event, newValue) => {
                setSelectedProveedor(newValue);
                setFormData(prev => ({ ...prev, id_proveedor: newValue ? newValue.id : '' }));
            }}
            renderInput={(params) => <TextField {...params} label="Proveedor" margin="normal" fullWidth className="modern-input" />}
        />
        <TextField label="Total Compra" required type="number" fullWidth margin="normal" value={formData.totalCompra || ''} onChange={(e) => setFormData({ ...formData, totalCompra: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
    </>
));

export const InventarioForm = memo(({ formData, setFormData }) => (
    <>
        <TextField label="Nombre" required fullWidth margin="normal" value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="modern-input" />
        <TextField
            select
            label="Tipo Paquete"
            fullWidth
            margin="normal"
            value={formData.tipoPaquete || 6}
            onChange={(e) => setFormData({ ...formData, tipoPaquete: e.target.value })}
            className="modern-input"
        >
            {[6, 8, 12, 24].map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
        </TextField>
        <TextField label="Cantidad Paquetes" type="number" fullWidth margin="normal" value={formData.cantidadPaquetes || ''} onChange={(e) => setFormData({ ...formData, cantidadPaquetes: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
        <TextField label="Cantidad Unidades" type="number" fullWidth margin="normal" value={formData.cantidadUnidades || ''} onChange={(e) => setFormData({ ...formData, cantidadUnidades: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
        <TextField label="Precio Venta Paquete" type="number" fullWidth margin="normal" value={formData.precioVenta_Paq || ''} onChange={(e) => setFormData({ ...formData, precioVenta_Paq: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
        <TextField label="Precio Compra Paquete" type="number" fullWidth margin="normal" value={formData.precioCompra_Paq || ''} onChange={(e) => setFormData({ ...formData, precioCompra_Paq: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
    </>
));

