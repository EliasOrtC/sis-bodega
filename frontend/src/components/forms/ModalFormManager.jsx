import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useLocation } from 'react-router-dom';
import { VentasForm, ClientesForm, EmpleadosForm, ComprasForm, InventarioForm } from './FloatingMenuForms';
import { API_BASE_URL } from '../../utils/config';

const ModalFormManager = forwardRef(({
    initialData = {},
    isEdit = false,
    catalogs = {},
    onSubmit,
}, ref) => {
    const location = useLocation();
    const [formData, setFormData] = useState(initialData || {});

    // UI Selection States
    const [selectedEmpleado, setSelectedEmpleado] = useState(null);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [selectedProveedor, setSelectedProveedor] = useState(null);
    const [selectedSupervisor, setSelectedSupervisor] = useState(null);

    // Cart States
    const [cartItems, setCartItems] = useState([]);
    const [originalCartItems, setOriginalCartItems] = useState([]);
    const [selectedProducto, setSelectedProducto] = useState(null);
    const [cantidadPaquetes, setCantidadPaquetes] = useState(0);
    const [cantidadUnidades, setCantidadUnidades] = useState(0);
    const [editingIndex, setEditingIndex] = useState(null);
    const [error, setError] = useState(null);

    // Initialize component state from initialData (mostly for edits)
    useEffect(() => {
        if (isEdit && initialData && Object.keys(initialData).length > 0) {
            // Format dates for input type="date"
            const formattedData = { ...initialData };
            const dateFields = ['fechaRegistro', 'fechaDeCompra', 'fechaDeNacimiento', 'fechaDeInicioContrato', 'fechaDeFinContrato'];
            dateFields.forEach(field => {
                if (formattedData[field]) {
                    formattedData[field] = formattedData[field].split('T')[0];
                }
            });
            setFormData(formattedData);

            // Restore selections based on ID if catalogs are available
            if (location.pathname === '/ventas') {
                if (initialData.empleado && catalogs.empleados) {
                    const emp = catalogs.empleados.find(e => e.id === initialData.empleado.id);
                    setSelectedEmpleado(emp || null);
                }
                if (initialData.cliente && catalogs.clientes) {
                    const cli = catalogs.clientes.find(c => c.id === initialData.cliente.id);
                    setSelectedCliente(cli || null);
                }

                // Fetch details for sales edit
                const fetchDetails = async () => {
                    try {
                        const response = await fetch(`${API_BASE_URL}/detalles-ventas/${initialData.id}`);
                        if (response.ok) {
                            const details = await response.json();
                            setCartItems(details);
                            setOriginalCartItems(details);
                        }
                    } catch (error) {
                        console.error('Error fetching sale details:', error);
                    }
                };
                fetchDetails();

            } else if (location.pathname === '/empleados') {
                if (initialData.supervisor && catalogs.supervisores) {
                    const sup = catalogs.supervisores.find(s => s.id === (initialData.supervisor?.id || initialData.supervisor));
                    setSelectedSupervisor(sup || null);
                }
            } else if (location.pathname === '/compras') {
                if (initialData.id_proveedor && catalogs.proveedores) {
                    const prov = catalogs.proveedores.find(p => p.id === initialData.id_proveedor);
                    setSelectedProveedor(prov || null);
                }
            }
        } else if (!isEdit) {
            // Reset logic for new items only if not editing
            setFormData({});
            setCartItems([]);
            setOriginalCartItems([]);
            setEditingIndex(null);
            setSelectedEmpleado(null);
            setSelectedCliente(null);
            setSelectedProveedor(null);
            setSelectedSupervisor(null);
        }
        // Removed `catalogs` and `initialData` from direct dependencies to avoid re-renders on every update
        // We only want to initialize on mount or when isEdit changes
    }, [isEdit, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Cart Logic ---
    const handleAddToCart = useCallback(() => {
        if (!selectedProducto) {
            return { error: 'Selecciona un producto' };
        }

        let reqPaq = parseInt(cantidadPaquetes) || 0;
        let reqUnid = parseInt(cantidadUnidades) || 0;

        if (reqPaq === 0 && reqUnid === 0) {
            return { error: 'Ingresa una cantidad válida' };
        }

        const packType = selectedProducto.tipoPaquete || 6;

        // Normalizar: si las unidades superan el tipo de paquete, convertir a paquetes
        if (reqUnid >= packType) {
            reqPaq += Math.floor(reqUnid / packType);
            reqUnid = reqUnid % packType;
        }

        // --- VALIDACIÓN DE STOCK ---
        // 1. Calcular total de unidades disponibles en stock (en DB)
        const totalStockUnidades = (selectedProducto.cantidadPaquetes * packType) + selectedProducto.cantidadUnidades;

        // 2. Sumar lo que ya estaba en la venta original (porque está descontado en la DB)
        const wasInSale = originalCartItems
            .filter(item => item.id_producto === selectedProducto.id)
            .reduce((sum, item) => sum + (item.cantidadPaquetes * (item.tipoPaquete || packType)) + item.cantidadUnidades, 0);

        // 3. Calcular cuánto de este producto ya hay en el carrito actual (EXCLUYENDO el que estamos editando)
        const yaEnCarrito = cartItems
            .filter((item, index) => item.id_producto === selectedProducto.id && index !== editingIndex)
            .reduce((total, item) => total + (item.cantidadPaquetes * (item.tipoPaquete || packType)) + item.cantidadUnidades, 0);

        // 4. Unidades solicitadas ahora
        const unidadesSolicitadas = (reqPaq * packType) + reqUnid;

        const totalDisponibleRelativo = totalStockUnidades + wasInSale;

        if ((yaEnCarrito + unidadesSolicitadas) > totalDisponibleRelativo) {
            const stockPaq = Math.floor(totalDisponibleRelativo / packType);
            const stockUnid = totalDisponibleRelativo % packType;

            // Un mensaje más claro que explique que el total disponible incluye lo que ya estaba en la DB y lo que ya estaba en esta factura
            return {
                error: `Stock insuficiente.\nDisponible total: ${stockPaq} paq. y ${stockUnid} unid.\n` +
                    (yaEnCarrito > 0 ? `Ya tienes reservadas ${yaEnCarrito} unidades en otras líneas del carrito.` : '')
            };
        }
        // ---------------------------

        const price = selectedProducto.precioVenta_Paq || 0;
        const subtotal = (reqPaq * price) + (reqUnid * (price / packType));

        const newItem = {
            id: editingIndex !== null ? cartItems[editingIndex].id : undefined, // Preservar ID si estamos editando un detalle existente
            id_producto: selectedProducto.id,
            producto: selectedProducto,
            cantidadPaquetes: reqPaq,
            cantidadUnidades: reqUnid,
            precioUnitario: selectedProducto.precioVenta_Paq,
            subtotal: parseFloat(subtotal.toFixed(2))
        };

        // --- LÓGICA DE FUSIÓN (Merge) ---
        // Buscar si el producto ya está en el carrito (excluyendo la línea que estamos editando actualmente)
        const existingIndex = cartItems.findIndex((item, idx) =>
            item.id_producto === selectedProducto.id && idx !== editingIndex
        );

        if (existingIndex !== -1) {
            // Si ya existe, sumamos las cantidades a la línea existente
            setCartItems(prev => {
                const newItems = [...prev];
                const existingItem = { ...newItems[existingIndex] };

                // Sumar unidades y paquetes (manejando el desborde de unidades según el tipo de paquete)
                let totalUnid = existingItem.cantidadUnidades + reqUnid;
                let totalPaq = existingItem.cantidadPaquetes + reqPaq + Math.floor(totalUnid / packType);
                totalUnid = totalUnid % packType;

                const updatedSubtotal = (totalPaq * price) + (totalUnid * (price / packType));

                newItems[existingIndex] = {
                    ...existingItem,
                    cantidadPaquetes: totalPaq,
                    cantidadUnidades: totalUnid,
                    subtotal: parseFloat(updatedSubtotal.toFixed(2))
                };

                // Si estábamos editando una línea diferente y la cambiamos a este producto, 
                // eliminamos la línea original que quedó vacía/duplicada
                if (editingIndex !== null) {
                    newItems.splice(editingIndex, 1);
                }

                return newItems;
            });
            setEditingIndex(null);
        } else {
            // Si no existe o es la misma línea, procedemos normal (Agregar o Actualizar)
            if (editingIndex !== null) {
                setCartItems(prev => {
                    const newItems = [...prev];
                    newItems[editingIndex] = newItem;
                    return newItems;
                });
                setEditingIndex(null);
            } else {
                setCartItems(prev => [...prev, newItem]);
            }
        }

        setSelectedProducto(null);
        setCantidadPaquetes(0);
        setCantidadUnidades(0);
        return { success: true };
    }, [selectedProducto, cantidadPaquetes, cantidadUnidades, cartItems, originalCartItems, editingIndex]);

    const handleEditFromCart = useCallback((index) => {
        const item = cartItems[index];
        if (!item) return;

        // Buscar el producto completo en el catálogo para asegurar que tenga precios y stock real
        const fullProduct = catalogs.productos?.find(p => p.id === item.id_producto) || item.producto;

        setSelectedProducto(fullProduct);
        setCantidadPaquetes(item.cantidadPaquetes);
        setCantidadUnidades(item.cantidadUnidades);
        setEditingIndex(index);
        setError(null);
    }, [cartItems, catalogs.productos]);

    const handleRemoveFromCart = useCallback((index) => {
        setCartItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const calculateTotal = useCallback(() => {
        return cartItems.reduce((total, item) => total + item.subtotal, 0).toFixed(2);
    }, [cartItems]);

    // --- Validation Logic ---
    const getBounds = () => {
        const now = new Date();
        const min = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()).toISOString().split('T')[0];
        const max = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate()).toISOString().split('T')[0];
        return { min, max };
    };

    const validateForm = (data) => {
        const { min, max } = getBounds();

        // 1. Validar campos vacíos en formData
        // Obtenemos los campos que son requeridos según el formulario activo
        const requiredFields = {
            '/ventas': ['id_empleado', 'id_cliente', 'fechaRegistro'],
            '/clientes': ['nombres', 'apellidos', 'correo', 'telefono', 'fechaRegistro', 'numCedula', 'direccion'],
            '/empleados': ['nombres', 'apellidos', 'estadoCivil', 'sexo', 'fechaDeNacimiento', 'fechaDeInicioContrato', 'ruc', 'numCedula', 'numInss', 'estado', 'sector', 'salarioBase'],
            '/compras': ['fechaDeCompra', 'id_proveedor', 'totalCompra'],
            '/inventario': ['nombre', 'tipoPaquete', 'cantidadPaquetes', 'cantidadUnidades', 'precioVenta_Paq', 'precioCompra_Paq']
        }[location.pathname] || [];

        for (const field of requiredFields) {
            if (!data.formData[field] && data.formData[field] !== 0) {
                return `El campo ${field} es obligatorio`;
            }
        }

        // 2. Validar que si es venta, tenga al menos un producto
        if (location.pathname === '/ventas' && data.cartItems.length === 0) {
            return 'Debes agregar al menos un producto a la venta';
        }

        // 3. Validar rangos de fecha
        const dateValues = Object.entries(data.formData)
            .filter(([key, val]) => (key.toLowerCase().includes('fecha') || key === 'inicio' || key === 'fin') && val)
            .map(([_, val]) => val);

        for (const dateVal of dateValues) {
            if (dateVal < min || dateVal > max) {
                return `La fecha ${dateVal} está fuera del rango permitido (-10 a +3 años)`;
            }
        }

        return null; // Todo bien
    };

    // --- Expose Submit Method ---
    useImperativeHandle(ref, () => ({
        submit: () => {
            const submissionData = {
                formData,
                cartItems,
                id_empleado: selectedEmpleado?.id || formData.id_empleado,
                id_cliente: selectedCliente?.id || formData.id_cliente,
                id_proveedor: selectedProveedor?.id || formData.id_proveedor,
                id_supervisor: selectedSupervisor?.id || formData.supervisor || formData.Supervisor,
                selectedEmpleado,
                selectedCliente,
                selectedProveedor,
                calculatedTotal: calculateTotal()
            };

            const validationError = validateForm(submissionData);
            if (validationError) {
                setError(validationError);
                // Propagar el error o mostrarlo localmente si es necesario
                // Pero generalmente el componente padre maneja el guardado. 
                // Para que el padre sepa que falló, podemos retornar false o lanzar algo.
                alert(validationError); // Simple alert para feedback inmediato
                return false;
            }

            onSubmit(submissionData);
            return true;
        }
    }));

    // Render Logic
    const commonProps = {
        formData,
        setFormData,
        isEdit
    };

    switch (location.pathname) {
        case '/ventas':
            return (
                <VentasForm
                    {...commonProps}
                    empleados={catalogs.empleados}
                    clientes={catalogs.clientes}
                    productos={catalogs.productos}
                    cartItems={cartItems}
                    originalCartItems={originalCartItems}
                    cartMode={cartItems.length > 0}
                    error={error}
                    editingIndex={editingIndex}
                    handleCancelEdit={() => {
                        setEditingIndex(null);
                        setSelectedProducto(null);
                        setCantidadPaquetes(0);
                        setCantidadUnidades(0);
                        setError(null);
                    }}
                    handleEditFromCart={handleEditFromCart}
                    handleAddToCart={() => {
                        const result = handleAddToCart();
                        if (result?.error) {
                            setError(result.error);
                            setTimeout(() => setError(null), 4000);
                        } else {
                            setError(null);
                        }
                    }}
                    handleRemoveFromCart={handleRemoveFromCart}
                    calculateTotal={calculateTotal}
                    selectedEmpleado={selectedEmpleado}
                    setSelectedEmpleado={setSelectedEmpleado}
                    selectedCliente={selectedCliente}
                    setSelectedCliente={setSelectedCliente}
                    selectedProducto={selectedProducto}
                    setSelectedProducto={setSelectedProducto}
                    cantidadPaquetes={cantidadPaquetes}
                    setCantidadPaquetes={setCantidadPaquetes}
                    cantidadUnidades={cantidadUnidades}
                    setCantidadUnidades={setCantidadUnidades}
                />
            );
        case '/clientes':
            return <ClientesForm {...commonProps} />;
        case '/empleados':
            return (
                <EmpleadosForm
                    {...commonProps}
                    supervisores={catalogs.supervisores}
                    selectedSupervisor={selectedSupervisor}
                    setSelectedSupervisor={setSelectedSupervisor}
                />
            );
        case '/compras':
            return (
                <ComprasForm
                    {...commonProps}
                    proveedores={catalogs.proveedores}
                    selectedProveedor={selectedProveedor}
                    setSelectedProveedor={setSelectedProveedor}
                />
            );
        case '/inventario':
            return <InventarioForm {...commonProps} />;
        default:
            return null;
    }
});

export default ModalFormManager;
