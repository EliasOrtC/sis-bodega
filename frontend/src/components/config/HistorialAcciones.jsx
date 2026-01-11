import React, { useState, useEffect } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, CircularProgress } from '@mui/material';
import { API_BASE_URL } from '../../utils/config';

const HistorialAcciones = () => {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistorial = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/historial`);
                if (response.ok) {
                    const data = await response.json();
                    setHistorial(data);
                }
            } catch (error) {
                console.error('Error fetching historial:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistorial();
    }, []);

    const getActionClass = (accion) => {
        switch (accion) {
            case 'INSERT': return 'badge-insert';
            case 'UPDATE': return 'badge-update';
            case 'DELETE': return 'badge-delete';
            default: return '';
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" className="config-title">Historial de Acciones</Typography>
            <TableContainer component={Paper} elevation={0} className="history-table-container">
                <Table className="history-table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Usuario</TableCell>
                            <TableCell>Tabla</TableCell>
                            <TableCell>Acción</TableCell>
                            <TableCell>Descripción</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {historial.length > 0 ? (
                            historial.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.fecha}</TableCell>
                                    <TableCell>{item.usuarioNombre}</TableCell>
                                    <TableCell>{item.tabla}</TableCell>
                                    <TableCell>
                                        <span className={`action-badge ${getActionClass(item.accion)}`}>
                                            {item.accion}
                                        </span>
                                    </TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">No hay registros de acciones todavía.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default HistorialAcciones;
