import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../utils/socket';
import { API_BASE_URL } from '../utils/config';
import { useUI } from '../context/UIContext';

const BASE_URL = API_BASE_URL;

const useTableData = (endpoint, socketEvent, selectedItem, setSelectedItem) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tableClass, setTableClass] = useState('table-initial');

    // Consumir el estado de la UI para saber si el asistente está abierto
    const { isAssistantOpen } = useUI();

    // Refs for state that shouldn't trigger fetchData re-creation
    const lastCountRef = useRef(0);
    const timeoutRef = useRef(null);
    const isMounted = useRef(true);

    const [windowHeight] = useState(window.innerHeight);
    const vhToPx = windowHeight / 100;
    const rowHeight = vhToPx ** 2.67;

    const maxHeightValue = tableClass === 'table-initial' ? '100px' : `${57 + (rowHeight * data.length)}px`;
    const timeTransition = ((1 / (data.length || 100)) * 10) + 1;

    const fetchData = useCallback(async () => {
        const startTime = Date.now();
        try {
            // Obtener el token del almacenamiento local o de sesión
            const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
            const token = user?.token || localStorage.getItem('token') || sessionStorage.getItem('token');

            const response = await fetch(`${BASE_URL}/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.status === 401 || response.status === 403) {
                window.dispatchEvent(new CustomEvent('sessionExpired'));
                throw new Error('Sesión expirada');
            }
            if (!response.ok) throw new Error(`Error al obtener ${endpoint}`);
            const json = await response.json();
            const dataArray = Array.isArray(json) ? json : [];

            if (isMounted.current) {
                setData(dataArray);
                lastCountRef.current = dataArray.length;
                setError(null);
            }
        } catch (err) {
            if (isMounted.current) setError(err.message);
        } finally {
            if (isMounted.current) {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, 800 - elapsedTime);

                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    if (isMounted.current) setLoading(false);
                }, remainingTime);
            }
        }
    }, [endpoint]);

    useEffect(() => {
        isMounted.current = true;

        // Cargar datos iniciales siempre, a menos que estemos desmontando
        fetchData();

        const handleSocketUpdate = () => {
            // Throttling: evitar múltiples peticiones seguidas si llegan muchos eventos de socket
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(fetchData, 300);
        };

        // Solo suscribirse si el asistente NO está abierto
        if (socketEvent && !isAssistantOpen) {
            socket.on(socketEvent, handleSocketUpdate);
        }

        // Sondeo inteligente: solo si la pestaña está visible y el asistente cerrado
        const pollingInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && !isAssistantOpen) {
                fetchData();
            }
        }, 30000); // Aumentado a 30s para reducir carga de red

        return () => {
            isMounted.current = false;
            // Limpiar listener independientemente de si se añadió (socket.off es seguro)
            if (socketEvent) {
                socket.off(socketEvent, handleSocketUpdate);
            }
            clearInterval(pollingInterval);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [fetchData, socketEvent, isAssistantOpen]);

    // Handle initial table transition
    useEffect(() => {
        if (data.length > 0 && tableClass === 'table-initial') {
            const timer = setTimeout(() => {
                if (isMounted.current) setTableClass('table-final');
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [data.length, tableClass]);

    // Sync selection de forma eficiente (solo si cambian datos relevantes)
    useEffect(() => {
        if (selectedItem && data.length > 0) {
            const updatedItem = data.find(item => item.id === selectedItem.id);
            if (!updatedItem) {
                setSelectedItem(null);
            } else {
                // Solo actualizar si el objeto ha cambiado realmente (shallow equality check minimal)
                // Comparamos campos clave o usamos un hash rápido si estuviera disponible.
                // Como fallback seguro, comparamos el string pero solo de ESTE objeto, no del array.
                const updatedStr = JSON.stringify(updatedItem);
                const selectedStr = JSON.stringify(selectedItem);
                if (updatedStr !== selectedStr) {
                    setSelectedItem(updatedItem);
                }
            }
        }
    }, [data, selectedItem, setSelectedItem]);

    return {
        data,
        loading,
        error,
        tableClass,
        maxHeightValue,
        timeTransition
    };
};

export default useTableData;
