import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/config';

const useFloatingMenuData = (path) => {
    const [empleados, setEmpleados] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [supervisores, setSupervisores] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async (endpoint, setter) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`);
            if (response.ok) {
                const data = await response.json();
                setter(data);
            }
        } catch (error) {
            console.error(`Error al obtener ${endpoint}:`, error);
        }
    }, []);

    const loadRequiredData = useCallback(async () => {
        setLoading(true);
        const fetches = [];

        if (path === '/ventas') {
            fetches.push(fetchData('empleados', setEmpleados));
            fetches.push(fetchData('clientes', setClientes));
            fetches.push(fetchData('inventario', setProductos));
        } else if (path === '/empleados') {
            fetches.push(fetchData('empleados', setSupervisores));
        } else if (path === '/compras') {
            fetches.push(fetchData('proveedores', setProveedores));
        }

        await Promise.all(fetches);
        setLoading(false);
    }, [path, fetchData]);

    useEffect(() => {
        loadRequiredData();
    }, [loadRequiredData]);

    return {
        empleados,
        clientes,
        supervisores,
        proveedores,
        productos,
        loadingData: loading,
        refreshData: loadRequiredData
    };
};

export default useFloatingMenuData;
