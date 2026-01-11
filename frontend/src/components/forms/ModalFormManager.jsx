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
    const [selectedProducto, setSelectedProducto] = useState(null);
    const [cantidadPaquetes, setCantidadPaquetes] = useState(0);
    const [cantidadUnidades, setCantidadUnidades] = useState(0);

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

        if (cantidadPaquetes === 0 && cantidadUnidades === 0) {
            return { error: 'Ingresa una cantidad válida' };
        }

        const subtotal = (cantidadPaquetes * selectedProducto.precioVenta_Paq) +
            (cantidadUnidades * (selectedProducto.precioVenta_Paq / selectedProducto.tipoPaquete));

        const newItem = {
            id_producto: selectedProducto.id,
            producto: selectedProducto,
            cantidadPaquetes: parseInt(cantidadPaquetes) || 0,
            cantidadUnidades: parseInt(cantidadUnidades) || 0,
            precioUnitario: selectedProducto.precioVenta_Paq,
            subtotal: parseFloat(subtotal.toFixed(2))
        };

        setCartItems(prev => [...prev, newItem]);
        setSelectedProducto(null);
        setCantidadPaquetes(0);
        setCantidadUnidades(0);
        return { success: true };
    }, [selectedProducto, cantidadPaquetes, cantidadUnidades]);

    const handleRemoveFromCart = useCallback((index) => {
        setCartItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const calculateTotal = useCallback(() => {
        return cartItems.reduce((total, item) => total + item.subtotal, 0).toFixed(2);
    }, [cartItems]);

    // --- Expose Submit Method ---
    useImperativeHandle(ref, () => ({
        submit: () => {
            // Collect all necessary state and pass to parent
            const submissionData = {
                formData,
                cartItems,
                // Add specific ID fields that might be loose in `formData` but double checking
                id_empleado: selectedEmpleado?.id,
                id_cliente: selectedCliente?.id,
                id_proveedor: selectedProveedor?.id,
                selectedEmpleado,
                selectedCliente,
                selectedProveedor,
                calculatedTotal: calculateTotal()
            };
            onSubmit(submissionData);
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
                    cartMode={cartItems.length > 0}
                    handleAddToCart={() => {
                        const result = handleAddToCart();
                        if (result?.error) {
                            alert(result.error);
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
