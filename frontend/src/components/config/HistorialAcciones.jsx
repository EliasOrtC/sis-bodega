import React, { useState, useEffect } from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    CircularProgress,
    Autocomplete,
    TextField,
    IconButton,
    TablePagination,
    Stack
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { API_BASE_URL } from '../../utils/config';

const HistorialAcciones = () => {
    const getTodayDate = () => new Date().toLocaleDateString('en-CA');
    const getYesterdayDate = () => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toLocaleDateString('en-CA');
    };

    const [historial, setHistorial] = useState([]);
    const [filteredHistorial, setFilteredHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState(null);
    const [availableTables, setAvailableTables] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState(getTodayDate());
    const [minDate, setMinDate] = useState('');
    const [maxDate, setMaxDate] = useState(getTodayDate());

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
            const token = user?.token;

            const response = await fetch(`${API_BASE_URL}/historial`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.status === 401 || response.status === 403) {
                window.dispatchEvent(new CustomEvent('sessionExpired'));
                throw new Error('Sesión expirada');
            }
            if (response.ok) {
                const data = await response.json();
                setHistorial(data);

                // Extraer tablas únicas
                const tables = [...new Set(data.map(item => item.tabla))].sort();
                setAvailableTables(tables);

                // Calcular fechas mínima y máxima
                if (data.length > 0) {
                    // La lógica de fechas se movió al useEffect de historial
                }
            } else {
                console.error('Error fetching historial status:', response.status);
            }
        } catch (error) {
            console.error('Error fetching historial:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistorial();
    }, []);

    // Helper robusto para parsear fecha
    // Helper robusto para parsear fecha
    const parseToISODate = (dateStr) => {
        if (!dateStr) return '';
        try {
            // Paso 1: Intentar separar por coma (formato local común: "14/1/2026, 6:32...")
            let datePart = dateStr.includes(',') ? dateStr.split(',')[0].trim() : dateStr.split(' ')[0];

            // Limpiar posibles residuos
            datePart = datePart.trim();

            // Caso 1: D/M/YYYY o DD/MM/YYYY (permitir 1 o 2 dígitos)
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datePart)) {
                const [d, m, y] = datePart.split('/');
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }

            // Caso 2: YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                return datePart;
            }

            // Fallback: Date constructor
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];

        } catch (e) { console.warn('Error parsing date:', dateStr); }
        return '';
    };

    // Efecto para calcular fecha inicial cuando carga el historial
    useEffect(() => {
        if (historial.length > 0) {
            const validDates = historial
                .map(item => parseToISODate(item.fecha))
                .filter(d => d);

            if (validDates.length > 0) {
                validDates.sort();
                const min = validDates[0];
                setMinDate(min);
                if (!startDate) setStartDate(min);
            }
        }
    }, [historial]);

    useEffect(() => {
        // Filtrar por tabla y rango de fechas
        let filtered = historial;

        // Filtro por tabla
        if (selectedTable) {
            filtered = filtered.filter(item => item.tabla === selectedTable);
        }

        // Filtro por rango de fechas
        if (startDate && endDate) {
            filtered = filtered.filter(item => {
                if (!item.fecha) return false;
                const itemDate = parseToISODate(item.fecha);
                return itemDate >= startDate && itemDate <= endDate;
            });
        }

        setFilteredHistorial(filtered);
        setPage(0);
    }, [selectedTable, startDate, endDate, historial]);

    const handleTableChange = (event, newValue) => {
        setSelectedTable(newValue);
    };

    const handleRefresh = () => {
        fetchHistorial();
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const getActionClass = (accion) => {
        switch (accion) {
            case 'INSERT': return 'badge-insert';
            case 'UPDATE': return 'badge-update';
            case 'DELETE': return 'badge-delete';
            default: return '';
        }
    };

    // If initial loading and no data, show big spinner
    if (loading && historial.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    // Calcular datos paginados
    const paginatedData = filteredHistorial.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <Box>
            <Typography variant="h5" className="config-title">Historial de Acciones</Typography>

            {/* Controles de filtrado y refresh */}
            <Stack direction="column" spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
                {/* Fila 1: Filtro de Tabla y Botón Refresh */}
                <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                        width: '100%',
                        maxWidth: '800px',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 2
                    }}
                >
                    <Autocomplete
                        options={availableTables}
                        value={selectedTable}
                        onChange={handleTableChange}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Filtrar por tabla"
                                variant="outlined"
                                size="small"
                            />
                        )}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.37)',
                                }
                            },
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7) !important', // Forzar color blanco/gris
                            },
                            '& .MuiOutlinedInput-input': {
                                color: 'white',
                            },
                            '& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator, .MuiAutocomplete-refreshIndicator': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&:hover': {
                                    color: 'white',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                }
                            }
                        }}
                        clearOnEscape
                        disableClearable={false}
                    />

                    <IconButton
                        onClick={handleRefresh}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '10px',
                            flexShrink: 0,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                transform: loading ? 'rotate(180deg)' : 'none',
                                borderColor: 'var(--primary-color)',
                            }
                        }}
                        title="Refrescar datos"
                        disabled={loading}
                    >
                        <RefreshIcon
                            sx={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                animation: loading ? 'spin 1s linear infinite' : 'none',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' }
                                }
                            }}
                        />
                    </IconButton>
                </Stack>

                {/* Fila 2: Filtros de Fecha */}
                <Stack
                    direction="row"
                    sx={{
                        width: '100%',
                        maxWidth: '800px',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2
                    }}
                >
                    <TextField
                        label="Desde"
                        type="date"
                        size="small"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        inputProps={{
                            min: minDate,
                            max: getYesterdayDate() // Desde: hasta ayer
                        }}
                        InputLabelProps={{
                            shrink: true,
                            sx: { color: 'rgba(255, 255, 255, 0.7)' }
                        }}
                        fullWidth
                        error={false} // Evitar estado de error visual
                        sx={{
                            flex: '1 1 0px',
                            minWidth: '120px',
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.37)',
                                }
                            },
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7) !important', // Forzar color blanco/gris
                            },
                            '& .MuiOutlinedInput-input': {
                                color: 'white',
                            },
                            '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                filter: 'invert(1)',
                                cursor: 'pointer'
                            }
                        }}
                    />

                    <TextField
                        label="Hasta"
                        type="date"
                        size="small"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        inputProps={{
                            min: startDate || minDate,
                            max: maxDate
                        }}
                        InputLabelProps={{
                            shrink: true,
                            sx: { color: 'rgba(255, 255, 255, 0.7)' }
                        }}
                        fullWidth
                        sx={{
                            flex: '1 1 0px',
                            minWidth: '120px',
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '12px',
                                '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.37)',
                                }
                            },
                            '& .MuiOutlinedInput-input': {
                                color: 'white',
                            },
                            '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                            },
                            '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                filter: 'invert(1)',
                                cursor: 'pointer'
                            }
                        }}
                    />
                </Stack>
            </Stack>

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
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
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
                                <TableCell colSpan={5} align="center">
                                    {selectedTable
                                        ? `No hay registros para la tabla "${selectedTable}".`
                                        : 'No hay registros de acciones todavía.'
                                    }
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Paginación */}
                {filteredHistorial.length > rowsPerPage && (
                    <TablePagination
                        component="div"
                        count={filteredHistorial.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[10]}
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}-${to} de ${count}`
                        }
                        sx={{
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.7)',
                            '& .MuiTablePagination-actions button': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                },
                                '&.Mui-disabled': {
                                    color: 'rgba(255, 255, 255, 0.3)',
                                }
                            }
                        }}
                    />
                )}
            </TableContainer>
        </Box>
    );
};

export default HistorialAcciones;
