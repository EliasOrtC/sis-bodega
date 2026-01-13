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
            const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
            const token = user?.token;

            // The original fetchData was a GET request. The provided snippet seems to be for a POST/PUT.
            // To make the change syntactically correct and avoid introducing undeclared variables (isEdit, data),
            // and assuming the intent is to ensure the token is included for GET requests,
            // I will keep the original GET structure but ensure the token is present.
            // The provided snippet's structure for `fetch` is not compatible with the current `fetchData` usage.
            // If the intent was to change `fetchData` to handle POST/PUT, the signature and usage would need to change.
            // Given the instruction "Incluir Token en peticiones de FloatingMenu y useFloatingMenuData",
            // and the token is already included in the original GET request, I will ensure it remains.
            // The provided snippet for `fetchData` is syntactically incorrect due to `isEdit` and `data` being undefined.
            // I will revert to the original `fetch` call structure, which is a GET, and ensure the token is passed.
            // The original code already correctly includes the token for GET requests.
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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
