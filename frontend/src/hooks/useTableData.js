import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../utils/socket';
import { API_BASE_URL } from '../utils/config';

const BASE_URL = API_BASE_URL;

const useTableData = (endpoint, socketEvent, selectedItem, setSelectedItem) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tableClass, setTableClass] = useState('table-initial');

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
        fetchData();

        const handleSocketUpdate = () => {
            fetchData();
        };

        if (socketEvent) {
            socket.on(socketEvent, handleSocketUpdate);
        }

        // Reduced polling frequency if socket is active, or use it as fallback
        const pollingInterval = setInterval(fetchData, 15000);

        return () => {
            isMounted.current = false;
            if (socketEvent) {
                socket.off(socketEvent, handleSocketUpdate);
            }
            clearInterval(pollingInterval);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [fetchData, socketEvent]);

    // Handle initial table transition
    useEffect(() => {
        if (data.length > 0 && tableClass === 'table-initial') {
            const timer = setTimeout(() => {
                if (isMounted.current) setTableClass('table-final');
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [data.length, tableClass]);

    // Sync selection
    useEffect(() => {
        if (selectedItem && data.length > 0) {
            const updatedItem = data.find(item => item.id === selectedItem.id);
            if (updatedItem) {
                // Use a more efficient check if possible, or only update if references differ
                // but since data is new array from fetch, references will always differ.
                // We'll keep the stringify but at least narrowed down by ID.
                if (JSON.stringify(updatedItem) !== JSON.stringify(selectedItem)) {
                    setSelectedItem(updatedItem);
                }
            } else {
                setSelectedItem(null);
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
