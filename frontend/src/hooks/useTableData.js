import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';

const BASE_URL = 'http://192.168.1.235:5001';

const useTableData = (endpoint, socketEvent, selectedItem, setSelectedItem) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastCount, setLastCount] = useState(0);
    const [tableClass, setTableClass] = useState('table-initial');

    const [windowHeight] = useState(window.innerHeight);
    const vhToPx = windowHeight / 100;
    const rowHeight = vhToPx ** 2.67;

    const maxHeightValue = tableClass === 'table-initial' ? '100px' : `${57 + (rowHeight * data.length)}px`;
    const timeTransition = ((1 / (data.length || 100)) * 10) + 1;


    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(`${BASE_URL}/${endpoint}`);
            if (!response.ok) throw new Error(`Error al obtener ${endpoint}`);
            const json = await response.json();
            const dataArray = Array.isArray(json) ? json : [];

            setData(dataArray);
            if (dataArray.length !== lastCount) {
                setLastCount(dataArray.length);
            }
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [endpoint, lastCount]);

    useEffect(() => {
        fetchData();

        if (socketEvent) {
            socket.on(socketEvent, fetchData);
        }

        const pollingInterval = setInterval(fetchData, 5000);

        return () => {
            if (socketEvent) socket.off(socketEvent);
            clearInterval(pollingInterval);
        };
    }, [fetchData, socketEvent]);

    // Handle initial table transition only
    useEffect(() => {
        if (data.length > 0 && tableClass === 'table-initial') {
            const timer = setTimeout(() => setTableClass('table-final'), 0); // Reduced delay
            return () => clearTimeout(timer);
        }
    }, [data.length, tableClass]);

    // Sync selection
    useEffect(() => {
        if (selectedItem) {
            const updatedItem = data.find(item => item.id === selectedItem.id);
            if (updatedItem) {
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
