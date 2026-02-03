import React, { memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Box, TextField, Autocomplete, MenuItem, Typography, Button, IconButton, Badge, Popover, Divider, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { validateAndIdentifyPhone } from '../../utils/phoneUtils';
import { validateNicaraguanCedula, formatCedula, validateEmail } from '../../utils/validationUtils';
import { IKContext, IKUpload, IKImage } from 'imagekitio-react';
import { IK_URL_ENDPOINT, IK_PUBLIC_KEY, IK_AUTHENTICATION_ENDPOINT, API_BASE_URL } from '../../utils/config';
import { resizeImage } from '../../utils/imageUtils';

const getBounds = () => {
    const now = new Date();
    const min = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    const max = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    return { min, max };
};

export const VentasForm = memo(({
    formData,
    setFormData,
    empleados,
    clientes,
    productos,
    cartItems,
    originalCartItems = [],
    error,
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
    editingIndex = null,
    handleEditFromCart,
    handleCancelEdit,
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

    // --- CÁLCULO DE STOCK DISPONIBLE (Stock Real - Carrito) ---
    const getAvailableStock = (product) => {
        if (!product) return { packages: 0, units: 0, total: 0 };
        const totalUnits = (product.cantidadPaquetes * product.tipoPaquete) + product.cantidadUnidades;

        // Sumar lo que ya estaba en esta venta (porque ya está descontado del totalUnits de la DB)
        const wasInSale = originalCartItems
            .filter(item => item.id_producto === product.id)
            .reduce((sum, item) => sum + (item.cantidadPaquetes * (item.tipoPaquete || product.tipoPaquete)) + item.cantidadUnidades, 0);

        // Restar lo que hay actualmente en el carrito (EXCLUYENDO el que estamos editando en el formulario)
        const inCart = cartItems
            .filter((item, index) => item.id_producto === product.id && index !== editingIndex)
            .reduce((sum, item) => sum + (item.cantidadPaquetes * (item.tipoPaquete || product.tipoPaquete)) + item.cantidadUnidades, 0);

        const available = totalUnits + wasInSale - inCart;
        return {
            packages: Math.floor(available / product.tipoPaquete),
            units: available % product.tipoPaquete,
            total: available
        };
    };

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
                {cartItems && cartItems.length > 0 ? (
                    <Badge
                        badgeContent={cartItems.length}
                        color="error"
                        overlap="circular"
                        sx={{
                            '& .MuiBadge-badge': {
                                backgroundColor: '#d32f2f',
                                color: 'white'
                            }
                        }}
                    >
                        <ShoppingCartIcon sx={{ fontSize: '1.6rem' }} />
                    </Badge>
                ) : (
                    <ShoppingCartIcon sx={{ fontSize: '1.6rem' }} />
                )}
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
                                                C${item.subtotal.toFixed(2)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => {
                                                    handleEditFromCart(index);
                                                    handleCloseCart();
                                                }}
                                                sx={{ mr: 0.5, opacity: 0.7, '&:hover': { opacity: 1 } }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemoveFromCart(index)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                            <Box className="cart-popover-footer">
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Total:
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#4caf50' }}>
                                    C${calculateTotal()}
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
                    id={isEdit ? "edit-empleado-select" : "add-empleado-select"}
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
                    noOptionsText={
                        <Typography variant="body2" sx={{ p: 1, textAlign: 'center' }}>
                            {empleados.length === 0 ? (
                                <>No hay empleados. <Link to="/empleados" state={{ openAddModal: true }} className="modern-link-autocomplete">Registrar empleado</Link></>
                            ) : (
                                <>¿El empleado no existe? <Link to="/empleados" state={{ openAddModal: true }} className="modern-link-autocomplete">Agregar</Link></>
                            )}
                        </Typography>
                    }
                />
                <Autocomplete
                    id={isEdit ? "edit-cliente-select" : "add-cliente-select"}
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
                    noOptionsText={
                        <Typography variant="body2" sx={{ p: 1, textAlign: 'center' }}>
                            {clientes.length === 0 ? (
                                <>No hay clientes. <Link to="/clientes" state={{ openAddModal: true }} className="modern-link-autocomplete">Registrar cliente</Link></>
                            ) : (
                                <>¿El cliente no existe? <Link to="/clientes" state={{ openAddModal: true }} className="modern-link-autocomplete">Agregar</Link></>
                            )}
                        </Typography>
                    }
                />
                <TextField
                    id={isEdit ? "edit-fecha-input" : "add-fecha-input"}
                    label="Fecha Registro"
                    required
                    type="date"
                    fullWidth
                    margin="normal"
                    value={formData.fechaRegistro || ''}
                    onChange={(e) => setFormData({ ...formData, fechaRegistro: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    inputProps={getBounds()}
                    className="modern-input"
                    disabled={cartMode && !isEdit}
                />
            </Box>

            <Box className="section-divider" sx={{ borderBottom: '2px solid rgba(255,255,255,0.2)', mb: 3 }} />

            <Box className="detalles-section">
                <Typography variant="h6" sx={{ mb: 2 }}>Detalles de Venta</Typography>
                <Autocomplete
                    id={isEdit ? "edit-producto-select" : "add-producto-select"}
                    key={`stock-select-${cartItems.length}-${editingIndex}`}
                    fullWidth
                    disablePortal
                    options={productos}
                    getOptionLabel={(option) => {
                        const availableStock = getAvailableStock(option);
                        const status = availableStock.total <= 0 ? '(AGOTADO)' : availableStock.total < option.tipoPaquete ? '(STOCK BAJO)' : '';
                        return `${option.nombre} - $${option.precioVenta_Paq} ${status}`;
                    }}
                    value={selectedProducto}
                    onChange={(event, newValue) => setSelectedProducto(newValue)}
                    renderInput={(params) => <TextField {...params} label="Producto" margin="normal" fullWidth className="modern-input" />}
                    noOptionsText={
                        <Typography variant="body2" sx={{ p: 1, textAlign: 'center' }}>
                            {productos.length === 0 ? (
                                <Link to="/inventario" state={{ openAddModal: true }} className="modern-link-autocomplete">Agregue un producto</Link>
                            ) : (
                                <>¿El producto no existe? <Link to="/inventario" state={{ openAddModal: true }} className="modern-link-autocomplete">Agregar</Link></>
                            )}
                        </Typography>
                    }
                    renderOption={(props, option) => {
                        const available = getAvailableStock(option);
                        const isOutOfStock = available.total <= 0;
                        return (
                            <li {...props} style={{ opacity: isOutOfStock ? 0.6 : 1, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <Typography variant="body2">{option.nombre}</Typography>
                                <Typography variant="caption" sx={{
                                    color: isOutOfStock ? 'error.main' : available.total < option.tipoPaquete ? 'warning.main' : 'success.main',
                                    fontWeight: 'bold'
                                }}>
                                    Disp: {available.packages}p | {available.units}u
                                </Typography>
                            </li>
                        );
                    }}
                />
                {selectedProducto && (() => {
                    const available = getAvailableStock(selectedProducto);
                    return (
                        <Typography variant="caption" sx={{
                            mt: -1,
                            mb: 1,
                            display: 'block',
                            color: available.total <= 0 ? '#d32f2f' : '#666',
                            fontWeight: 500
                        }}>
                            Disponible para vender: {available.packages} paquetes y {available.units} unidades
                        </Typography>
                    );
                })()}
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        id={isEdit ? "edit-paquetes-input" : "add-paquetes-input"}
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
                        id={isEdit ? "edit-unidades-input" : "add-unidades-input"}
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
                {error && (
                    <Box sx={{
                        mt: 1,
                        mb: 1,
                        p: 1.5,
                        bgcolor: 'rgba(211, 47, 47, 0.05)',
                        border: '1px solid #d32f2f',
                        borderRadius: '8px',
                        animation: 'fadeIn 0.3s ease-in'
                    }}>
                        <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 600, display: 'block', textAlign: 'center', whiteSpace: 'pre-line' }}>
                            {error}
                        </Typography>
                    </Box>
                )}
                <Box sx={{ display: 'flex', gap: 2, mt: editingIndex !== null ? 1 : 0 }}>
                    <Button
                        variant="contained"
                        onClick={handleAddToCart}
                        fullWidth
                        sx={{
                            mt: error ? 1 : 2,
                            mb: 3,
                            padding: '10px',
                            borderRadius: '10px',
                            transition: 'all 0.3s ease !important',
                            border: editingIndex !== null ? '1px solid #1976d2 !important' : '1px solid #610c0c !important',
                            background: editingIndex !== null ? 'linear-gradient(135deg, #1976d2, #115293) !important' : undefined,
                            '&:hover': {
                                boxShadow: editingIndex !== null ? '5px 5px 13px 0px rgba(25, 118, 210, 0.4) !important' : '5px 5px 13px 0px #b318188a !important',
                                transform: 'translateY(-2px) !important',
                                background: editingIndex !== null ? '#115293 !important' : '#8a1010 !important',
                            }
                        }}
                    >
                        {editingIndex !== null ? 'Actualizar Producto' : 'Agregar al Carrito'}
                    </Button>
                    {editingIndex !== null && (
                        <Button
                            variant="outlined"
                            onClick={handleCancelEdit}
                            sx={{
                                mt: error ? 1 : 2,
                                mb: 3,
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: 600
                            }}
                        >
                            Cancelar
                        </Button>
                    )}
                </Box>
            </Box>
        </>
    );
});




export const ClientesForm = memo(({ formData, setFormData, isEdit }) => {
    const prefix = isEdit ? 'edit-cliente-' : 'add-cliente-';
    const [phoneStatus, setPhoneStatus] = useState({ isValid: true, carrier: null, error: null, carrierColor: '#757575' });
    const [cedulaStatus, setCedulaStatus] = useState({ isValid: true, error: null });
    const [emailStatus, setEmailStatus] = useState({ isValid: true, error: null });

    // Validar teléfono al cargar (si es editar) o al cambiar
    React.useEffect(() => {
        if (formData.telefono) {
            const result = validateAndIdentifyPhone(formData.telefono);
            setPhoneStatus(result);
        } else {
            setPhoneStatus({ isValid: true, carrier: null, error: null });
        }
    }, [formData.telefono]);

    // Validar cédula al cambiar
    React.useEffect(() => {
        if (formData.numCedula) {
            const result = validateNicaraguanCedula(formData.numCedula);
            setCedulaStatus(result);
        } else {
            setCedulaStatus({ isValid: true, error: null });
        }
    }, [formData.numCedula]);

    // Validar email al cambiar
    React.useEffect(() => {
        if (formData.correo) {
            const result = validateEmail(formData.correo);
            setEmailStatus(result);
        } else {
            setEmailStatus({ isValid: true, error: null });
        }
    }, [formData.correo]);

    const handlePhoneChange = (e) => {
        const val = e.target.value;
        setFormData({ ...formData, telefono: val });
    };

    const handleCedulaChange = (e) => {
        const val = e.target.value;
        const formatted = formatCedula(val);
        setFormData({ ...formData, numCedula: formatted });
    };

    return (
        <>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666', mb: 1, mt: 1 }}>INFORMACIÓN PERSONAL</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField id={`${prefix}nombres`} label="Nombres" required fullWidth value={formData.nombres || ''} onChange={(e) => setFormData({ ...formData, nombres: e.target.value })} className="modern-input" />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField id={`${prefix}apellidos`} label="Apellidos" required fullWidth value={formData.apellidos || ''} onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })} className="modern-input" />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666', mb: 1, mt: 1 }}>IDENTIFICACIÓN Y CONTACTO</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        id={`${prefix}cedula`}
                        label="Número Cédula"
                        required
                        fullWidth
                        value={formData.numCedula || ''}
                        onChange={handleCedulaChange}
                        className="modern-input"
                        error={!!cedulaStatus.error && formData.numCedula?.length > 10}
                        helperText={!!cedulaStatus.error && formData.numCedula?.length > 10 ? cedulaStatus.error : "Formato: 001-000000-0000X"}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        id={`${prefix}telefono`}
                        label="Teléfono"
                        required
                        fullWidth
                        value={formData.telefono || ''}
                        onChange={handlePhoneChange}
                        className="modern-input"
                        error={!!phoneStatus.error && formData.telefono?.length > 0}
                        helperText={
                            <span style={{ display: 'block' }}>
                                {!!phoneStatus.error && formData.telefono?.length > 0 && (
                                    <span style={{ color: '#d32f2f', display: 'block', marginBottom: '2px' }}>{phoneStatus.error}</span>
                                )}
                                {phoneStatus.carrier && (
                                    <span style={{ color: phoneStatus.carrierColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        {phoneStatus.carrierLogo && (
                                            <img
                                                src={phoneStatus.carrierLogo}
                                                alt="Carrier"
                                                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                            />
                                        )}
                                        {phoneStatus.carrier}
                                    </span>
                                )}
                            </span>
                        }
                    />
                </Grid>

                <Grid item xs={12} sm={7}>
                    <TextField
                        id={`${prefix}correo`}
                        label="Correo"
                        required
                        type="email"
                        fullWidth
                        value={formData.correo || ''}
                        onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                        className="modern-input"
                        error={!!emailStatus.error && formData.correo?.length > 0}
                        helperText={!!emailStatus.error && formData.correo?.length > 0 ? emailStatus.error : ""}
                    />
                </Grid>
                <Grid item xs={12} sm={5}>
                    <TextField id={`${prefix}fecha`} label="Fecha Registro" required type="date" fullWidth value={formData.fechaRegistro || ''} onChange={(e) => setFormData({ ...formData, fechaRegistro: e.target.value })} InputLabelProps={{ shrink: true }} inputProps={getBounds()} className="modern-input" />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666', mb: 1, mt: 1 }}>DIRECCIÓN</Typography>
                </Grid>
                <Grid item xs={12}>
                    <TextField id={`${prefix}direccion`} label="Dirección" required fullWidth value={formData.direccion || ''} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="modern-input" />
                </Grid>
            </Grid>
        </>
    );
});

export const EmpleadosForm = memo(({ formData, setFormData, isEdit, supervisores, selectedSupervisor, setSelectedSupervisor }) => {
    const prefix = isEdit ? 'edit-empleado-' : 'add-empleado-';
    return (
        <>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField id={`${prefix}nombres`} label="Nombres" required fullWidth value={formData.nombres || ''} onChange={(e) => setFormData({ ...formData, nombres: e.target.value })} className="modern-input" />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField id={`${prefix}apellidos`} label="Apellidos" required fullWidth value={formData.apellidos || ''} onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })} className="modern-input" />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666', mb: 1, mt: 1 }}>DOCUMENTOS LEGALES</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField id={`${prefix}cedula`} label="Número Cédula" required fullWidth value={formData.numCedula || ''} onChange={(e) => setFormData({ ...formData, numCedula: e.target.value })} className="modern-input" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField id={`${prefix}ruc`} label="RUC" required fullWidth value={formData.ruc || ''} onChange={(e) => setFormData({ ...formData, ruc: e.target.value })} className="modern-input" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField id={`${prefix}inss`} label="Número INSS" required fullWidth value={formData.numInss || ''} onChange={(e) => setFormData({ ...formData, numInss: e.target.value })} className="modern-input" />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666', mb: 1, mt: 1 }}>INFORMACIÓN PERSONAL</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField id={`${prefix}estado-civil`} label="Estado Civil" required fullWidth value={formData.estadoCivil || ''} onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })} className="modern-input" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField id={`${prefix}sexo`} label="Sexo" required fullWidth value={formData.sexo || ''} onChange={(e) => setFormData({ ...formData, sexo: e.target.value })} className="modern-input" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField id={`${prefix}nacimiento`} label="Fecha Nacimiento" required type="date" fullWidth value={formData.fechaDeNacimiento || ''} onChange={(e) => setFormData({ ...formData, fechaDeNacimiento: e.target.value })} InputLabelProps={{ shrink: true }} inputProps={getBounds()} className="modern-input" />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666', mb: 1, mt: 1 }}>CONTRATO Y LABORAL</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField id={`${prefix}inicio`} label="Fecha Inicio Contrato" required type="date" fullWidth value={formData.fechaDeInicioContrato || ''} onChange={(e) => setFormData({ ...formData, fechaDeInicioContrato: e.target.value })} InputLabelProps={{ shrink: true }} inputProps={getBounds()} className="modern-input" />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField id={`${prefix}fin`} label="Fecha Fin Contrato" required type="date" fullWidth value={formData.fechaDeFinContrato || ''} onChange={(e) => setFormData({ ...formData, fechaDeFinContrato: e.target.value })} InputLabelProps={{ shrink: true }} inputProps={getBounds()} className="modern-input" />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField id={`${prefix}sector`} label="Sector" required fullWidth value={formData.sector || ''} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} className="modern-input" />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField id={`${prefix}estado`} label="Estado" required fullWidth value={formData.estado || ''} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="modern-input" />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#666', mb: 1, mt: 1 }}>SALARIO Y SUPERVISIÓN</Typography>
                </Grid>
                <Grid item xs={12} sm={supervisores ? 6 : 12}>
                    <TextField id={`${prefix}salario`} label="Salario Base" required type="number" fullWidth value={formData.salarioBase || ''} onChange={(e) => setFormData({ ...formData, salarioBase: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
                </Grid>
                {supervisores && (
                    <Grid item xs={12} sm={6}>
                        <Autocomplete
                            id={`${prefix}supervisor-select`}
                            fullWidth
                            disablePortal
                            options={supervisores}
                            getOptionLabel={(option) => `${option.nombres} ${option.apellidos}`}
                            value={selectedSupervisor}
                            onChange={(event, newValue) => {
                                setSelectedSupervisor(newValue);
                                setFormData(prev => ({ ...prev, supervisor: newValue ? newValue.id : null, Supervisor: newValue ? newValue.id : null }));
                            }}
                            renderInput={(params) => <TextField {...params} label="Supervisor" fullWidth className="modern-input" />}
                        />
                    </Grid>
                )}
            </Grid>
        </>
    );
});

export const ComprasForm = memo(({ formData, setFormData, isEdit, proveedores, selectedProveedor, setSelectedProveedor }) => {
    const prefix = isEdit ? 'edit-compra-' : 'add-compra-';
    return (
        <>
            <TextField id={`${prefix}fecha`} label="Fecha de Compra" required type="date" fullWidth margin="normal" value={formData.fechaDeCompra || ''} onChange={(e) => setFormData({ ...formData, fechaDeCompra: e.target.value })} InputLabelProps={{ shrink: true }} inputProps={getBounds()} className="modern-input" />
            <Autocomplete
                id={`${prefix}proveedor-select`}
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
            <TextField id={`${prefix}total`} label="Total Compra" required type="number" fullWidth margin="normal" value={formData.totalCompra || ''} onChange={(e) => setFormData({ ...formData, totalCompra: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
        </>
    );
});

export const InventarioForm = memo(({ formData, setFormData, isEdit }) => {
    const prefix = isEdit ? 'edit-inv-' : 'add-inv-';
    const [originalImageUrl] = useState(isEdit ? formData.imagen_url : null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    // Ref para rastrear si hemos subido algo en ESTA sesión del formulario
    // para evitar dejar "zombies" si el usuario sube varias fotos antes de guardar
    const sessionUploadUrlRef = useRef(null);

    const deleteFromIK = async (url) => {
        if (!url || !url.includes('ik.imagekit.io')) return;
        try {
            const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
            const token = user?.token || localStorage.getItem('token') || sessionStorage.getItem('token');
            await fetch(`${API_BASE_URL}/imagekit/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url })
            });
        } catch (error) {
            console.error("Error al intentar borrar de ImageKit:", error);
        }
    };

    // Efecto de limpieza al desmontar: si NO se guardó, borrar imagen huérfana
    useEffect(() => {
        return () => {
            if (sessionUploadUrlRef.current) {
                const urlToDelete = sessionUploadUrlRef.current;
                // Extraer el nombre del archivo para una comparación segura
                const fileNameToDelete = urlToDelete.split('/').pop().split('?')[0];

                setTimeout(() => {
                    const savedPath = window._preventDeleteUrl;
                    const savedFileName = savedPath?.split('/').pop().split('?')[0];

                    // Solo borrar si el archivo no coincide con lo que se acaba de guardar
                    if (savedFileName !== fileNameToDelete) {
                        deleteFromIK(urlToDelete);
                    }
                }, 2000);
            }
        };
    }, []);

    const onError = err => {
        setIsUploading(false);
        setUploadError(err.message || "Error al subir la imagen");
        console.error("Error de subida:", err);
    };

    const onSuccess = res => {
        setIsUploading(false);
        setUploadError(null);
        const serverUrl = res.url;
        const cleanPath = res.filePath;

        // Si ya habíamos subido una imagen en esta sesión, la borramos para no acumular
        if (sessionUploadUrlRef.current && sessionUploadUrlRef.current !== serverUrl) {
            deleteFromIK(sessionUploadUrlRef.current);
        }
        sessionUploadUrlRef.current = serverUrl;

        setFormData(prev => ({
            ...prev,
            imagen_url: serverUrl, // Actualizar a la URL del servidor directamente para mayor estabilidad
            imagen_path_server: cleanPath
        }));
    };

    // Determinar estados de imagen
    const hasOriginal = isEdit && originalImageUrl;
    const isNewImage = isEdit && formData.imagen_url && formData.imagen_url !== originalImageUrl;
    const noImage = !formData.imagen_url;

    const authenticator = async () => {
        setUploadError(null);
        try {
            const response = await fetch(IK_AUTHENTICATION_ENDPOINT);
            if (!response.ok) throw new Error(`Error de autenticación (${response.status})`);
            const data = await response.json();
            return { signature: data.signature, expire: data.expire, token: data.token };
        } catch (error) {
            setUploadError("Error al conectar con el servidor de seguridad");
            throw error;
        }
    };

    const handleCustomUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const localUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, imagen_url: localUrl }));

        setIsUploading(true);
        setUploadError(null);

        try {
            const resizedFile = await resizeImage(file, 2000, 2000);
            const { signature, expire, token } = await authenticator();

            const formDataUpload = new FormData();
            formDataUpload.append('file', resizedFile);
            formDataUpload.append('fileName', `prod_${Date.now()}.${file.name.split('.').pop()}`);
            formDataUpload.append('useUniqueFileName', 'true');
            formDataUpload.append('folder', '/Productos');
            formDataUpload.append('publicKey', IK_PUBLIC_KEY);
            formDataUpload.append('signature', signature);
            formDataUpload.append('expire', expire);
            formDataUpload.append('token', token);

            const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
                method: 'POST',
                body: formDataUpload
            });

            if (!uploadRes.ok) {
                const errText = await uploadRes.text();
                throw new Error(`Error subida: ${errText}`);
            }

            const data = await uploadRes.json();
            onSuccess(data);

        } catch (err) {
            console.error("Error en Custom Upload:", err);
            onError(err);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const removeImage = () => {
        // Solo borrar de ImageKit si es una imagen nueva subida EN ESTA sesión
        // No queremos borrar la imagen original que ya estaba en la DB si el usuario cancela
        if (formData.imagen_url && formData.imagen_url.includes('ik.imagekit.io')) {
            // Verificamos si la imagen actual es la que acabamos de subir en esta sesión
            const currentFileName = formData.imagen_url.split('/').pop().split('?')[0];
            const sessionFileName = sessionUploadUrlRef.current?.split('/').pop().split('?')[0];

            if (currentFileName === sessionFileName) {
                deleteFromIK(formData.imagen_url);
                sessionUploadUrlRef.current = null;
            }
        }

        setFormData(prev => ({
            ...prev,
            imagen_url: isEdit ? originalImageUrl : null,
            imagen_path_server: isEdit ? originalImageUrl : null // Restaurar original
        }));
    };

    return (
        <>
            {/* Sección de Imagen */}
            <Box sx={{ mt: 2, mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, opacity: 0.9 }}>
                    <CameraAltIcon sx={{ color: '#610c0c', fontSize: '1.2rem' }} />
                    Imagen del Producto
                </Typography>
                {/* ... (rest of image logic remains same, just better margins) ... */}
                <IKContext
                    urlEndpoint={IK_URL_ENDPOINT}
                    publicKey={IK_PUBLIC_KEY}
                    authenticator={authenticator}
                >
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        p: 2,
                        border: '1px dashed rgba(255,255,255,0.15)',
                        borderRadius: '16px',
                        background: 'rgba(255,255,255,0.02)',
                        minHeight: '120px',
                        justifyContent: 'center'
                    }}>

                        {/* MODO EDICIÓN: Mostrar comparativa o estado actual */}
                        {isEdit ? (
                            <Box sx={{
                                display: 'flex',
                                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                                gap: 3,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {/* Imagen Original / Anterior */}
                                {hasOriginal && (
                                    <Box sx={{ textAlign: 'center', flex: '1 1 auto', maxWidth: '250px' }}>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.6 }}>Imagen Anterior</Typography>
                                        <Box sx={{ p: 0.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <img
                                                src={originalImageUrl?.startsWith('http') || originalImageUrl?.startsWith('blob:')
                                                    ? originalImageUrl
                                                    : `https://ik.imagekit.io/gpb4w57ui/${originalImageUrl?.replace(/^\//, '')}`
                                                }
                                                alt="Anterior"
                                                style={{
                                                    borderRadius: '6px',
                                                    objectFit: 'contain',
                                                    maxWidth: '250px',
                                                    maxHeight: '250px',
                                                    width: '100%',
                                                    height: 'auto',
                                                    display: 'block',
                                                    margin: '0 auto',
                                                    opacity: isNewImage ? 0.5 : 1,
                                                    background: 'rgba(0,0,0,0.05)'
                                                }}
                                                onError={(e) => {
                                                    const img = e.target;
                                                    console.error("FALLO CARGA IMAGEN ANTERIOR:", img.src);
                                                    if (!img.src.includes('retry=')) {
                                                        setTimeout(() => {
                                                            const base = img.src.split('?')[0];
                                                            img.src = `${base}?retry=${Date.now()}`;
                                                        }, 2000);
                                                    }
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                )}

                                {/* Nueva Imagen Seleccionada */}
                                {isNewImage ? (
                                    <Box sx={{ textAlign: 'center', position: 'relative', animation: 'fadeIn 0.3s ease', flex: '1 1 auto', maxWidth: '250px' }}>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#4caf50', fontWeight: 'bold' }}>Nueva Imagen</Typography>
                                        <Box sx={{ p: 0.5, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: '10px', border: '2px solid #4caf50' }}>
                                            <img
                                                src={formData.imagen_url?.startsWith('http') || formData.imagen_url?.startsWith('blob:')
                                                    ? formData.imagen_url
                                                    : `https://ik.imagekit.io/gpb4w57ui/${formData.imagen_url?.replace(/^\//, '')}`
                                                }
                                                alt="Nueva"
                                                style={{
                                                    borderRadius: '6px',
                                                    objectFit: 'contain',
                                                    maxWidth: '250px',
                                                    maxHeight: '250px',
                                                    width: '100%',
                                                    height: 'auto',
                                                    display: 'block',
                                                    margin: '0 auto',
                                                    background: 'rgba(0,0,0,0.05)'
                                                }}
                                                onError={(e) => {
                                                    const img = e.target;
                                                    console.error("FALLO CARGA NUEVA IMAGEN:", img.src);
                                                    if (!img.src.includes('retry=')) {
                                                        setTimeout(() => {
                                                            const base = img.src.split('?')[0];
                                                            img.src = `${base}?retry=${Date.now()}`;
                                                        }, 1500);
                                                    }
                                                }}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={removeImage}
                                                sx={{
                                                    position: 'absolute',
                                                    top: 15,
                                                    right: -10,
                                                    bgcolor: '#d32f2f',
                                                    color: 'white',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                    '&:hover': { bgcolor: '#b31818' }
                                                }}
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '300px' }}>
                                        {noImage ? (
                                            <Box sx={{
                                                textAlign: 'center',
                                                p: 3,
                                                width: '100%',
                                                borderRadius: '12px',
                                                bgcolor: 'rgba(255,255,255,0.03)',
                                                border: '1px dashed rgba(255,255,255,0.1)',
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                minHeight: '120px',
                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' }
                                            }}>
                                                <CloudUploadIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleCustomUpload}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        opacity: 0,
                                                        cursor: 'pointer',
                                                        zIndex: 10
                                                    }}
                                                />
                                                <Typography variant="body2" sx={{ opacity: 0.7 }}>Pulsa para cambiar foto</Typography>
                                            </Box>
                                        ) : !isNewImage && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<EditIcon />}
                                                onClick={() => setFormData(prev => ({ ...prev, imagen_url: null }))}
                                                sx={{ borderRadius: '20px', textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)' }}
                                            >
                                                Cambiar Imagen
                                            </Button>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            /* MODO AGREGAR: Vista previa simple */
                            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                {formData.imagen_url ? (
                                    <Box sx={{ position: 'relative' }}>
                                        <img
                                            src={formData.imagen_url?.startsWith('http') || formData.imagen_url?.startsWith('blob:')
                                                ? formData.imagen_url
                                                : `https://ik.imagekit.io/gpb4w57ui/${formData.imagen_url?.replace(/^\//, '')}`
                                            }
                                            alt="Vista previa"
                                            style={{
                                                borderRadius: '12px',
                                                maxWidth: '100%',
                                                maxHeight: '250px',
                                                width: 'auto',
                                                height: 'auto',
                                                display: 'block',
                                                margin: '0 auto',
                                                objectFit: 'contain',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(0,0,0,0.1)'
                                            }}
                                            onError={(e) => {
                                                const img = e.target;
                                                if (!img.src.includes('retry=')) {
                                                    setTimeout(() => {
                                                        const base = img.src.split('?')[0];
                                                        img.src = `${base}?retry=${Date.now()}`;
                                                    }, 1500);
                                                }
                                            }}
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={removeImage}
                                            sx={{
                                                position: 'absolute',
                                                top: -10,
                                                right: -10,
                                                bgcolor: '#d32f2f',
                                                color: 'white',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                                '&:hover': { bgcolor: '#b31818' }
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ) : (
                                    <Box sx={{
                                        textAlign: 'center',
                                        p: 4,
                                        width: '100%',
                                        borderRadius: '16px',
                                        bgcolor: 'rgba(255,255,255,0.03)',
                                        border: '2px dashed rgba(255,255,255,0.1)',
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '200px',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', transform: 'scale(1.02)' }
                                    }}
                                    >
                                        {isUploading ? (
                                            <Typography variant="body2" sx={{ opacity: 0.6 }}>Subiendo archivo...</Typography>
                                        ) : (
                                            <>
                                                <CloudUploadIcon sx={{ fontSize: 50, mb: 1, opacity: 0.4 }} />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleCustomUpload}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        opacity: 0,
                                                        cursor: 'pointer',
                                                        zIndex: 10
                                                    }}
                                                />
                                                <Typography variant="body1" sx={{ fontWeight: 600, opacity: 0.8 }}>Pulsa para subir foto</Typography>
                                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.4 }}>Formatos aceptados: JPG, PNG, WEBP</Typography>
                                            </>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                </IKContext>
                {uploadError && (
                    <Typography variant="caption" sx={{ color: '#ff1744', display: 'block', mt: 1, textAlign: 'center', fontWeight: 'bold' }}>
                        {uploadError}
                    </Typography>
                )}
            </Box>

            <TextField id={`${prefix}nombre`} label="Nombre del Producto" required fullWidth margin="normal" value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="modern-input" />

            {/* Fila de Stock: Tipo, Paquetes, Unidades */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 1 }}>
                <TextField
                    id={`${prefix}tipo-paquete`}
                    select
                    label="Tipo Paquete"
                    fullWidth
                    margin="normal"
                    value={formData.tipoPaquete || 6}
                    onChange={(e) => setFormData({ ...formData, tipoPaquete: e.target.value })}
                    className="modern-input"
                >
                    {[6, 8, 12, 24].map((option) => (
                        <MenuItem key={option} value={option}>{option} unidades</MenuItem>
                    ))}
                </TextField>
                <TextField id={`${prefix}paquetes`} label="Cant. Paquetes" type="number" fullWidth margin="normal" value={formData.cantidadPaquetes || ''} onChange={(e) => setFormData({ ...formData, cantidadPaquetes: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
                <TextField id={`${prefix}unidades`} label="Cant. Unidades" type="number" fullWidth margin="normal" value={formData.cantidadUnidades || ''} onChange={(e) => setFormData({ ...formData, cantidadUnidades: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
            </Box>

            {/* Fila de Precios: Venta, Compra */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <TextField id={`${prefix}precio-venta`} label="Precio Venta (Paq)" type="number" fullWidth margin="normal" value={formData.precioVenta_Paq || ''} onChange={(e) => setFormData({ ...formData, precioVenta_Paq: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
                <TextField id={`${prefix}precio-compra`} label="Precio Compra (Paq)" type="number" fullWidth margin="normal" value={formData.precioCompra_Paq || ''} onChange={(e) => setFormData({ ...formData, precioCompra_Paq: e.target.value })} onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()} inputProps={{ min: 0 }} className="modern-input" />
            </Box>
        </>
    );
});

