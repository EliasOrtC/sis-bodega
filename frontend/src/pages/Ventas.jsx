import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, CardContent, Typography, Grid, Paper, Box, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, IconButton, Pagination, InputAdornment, Chip, Tooltip, Divider
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import TuneIcon from '@mui/icons-material/Tune';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useSelection } from '../context/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';
import TableStatus from '../components/common/TableStatus.jsx';
import { API_BASE_URL } from '../utils/config';
import SaleCard from '../components/ventas/SaleCard.jsx';
import '../styles/SalesCards.css';

const Sales = () => {
  const { selectedItem, setSelectedItem } = useSelection();
  const containerRef = useRef(null);

  const {
    data: sales,
    loading,
    error,
    timeTransition
  } = useTableData('ventas', 'VentasActualizadas', selectedItem, setSelectedItem);

  // Helper para obtener el rango por defecto inmediatamente
  const getDefaultDates = () => {
    const today = new Date();
    // Inicio: Primer día del mes anterior
    const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const startStr = `${firstDayPrevMonth.getFullYear()}-${String(firstDayPrevMonth.getMonth() + 1).padStart(2, '0')}-01`;

    // Fin: Hoy
    const endStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return { startStr, endStr };
  };

  const { startStr: defStart, endStr: defEnd } = getDefaultDates();

  // Limites de fechas
  const getBounds = () => {
    const now = new Date();
    const min = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    const max = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    return { min, max };
  };
  const { min: minDate, max: maxDate } = getBounds();

  // Estados para el filtro de fechas (Inicializados con valores calculados)
  const [filterType, setFilterType] = useState('nEmp'); // 'single' | 'range'
  const [startDate, setStartDate] = useState(defStart);
  const [endDate, setEndDate] = useState(defEnd);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para el modal de detalles
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados para paginación
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Filtrar ventas de forma eficiente (Memoizado)
  const filteredSales = React.useMemo(() => {
    if (!Array.isArray(sales)) return [];

    // Si no hay filtros activos y no hay búsqueda, devolvemos todo (o según lógica de negocio)
    // Pero aquí parece que siempre hay un rango por defecto, así que procedemos.

    const startStr = startDate;
    const endStr = endDate || new Date().toISOString().split('T')[0];
    const query = searchQuery ? searchQuery.toLowerCase() : '';

    return sales.filter(sale => {
      // Optimizamos: si el backend ya envía la fecha formateada o si podemos 
      // extraer el string sin crear un objeto Date completo sería ideal.
      // Como sale.fechaRegistro parece venir como "YYYY-MM-DD...", podemos hacer split.
      const saleDateStr = sale.fechaRegistro.split('T')[0].split(' ')[0];

      const isInDateRange = filterType === 'single'
        ? saleDateStr === startStr
        : (saleDateStr >= startStr && saleDateStr <= endStr);

      if (!isInDateRange) return false;
      if (!query) return true;

      // Filtros de búsqueda por texto
      if (filterType === 'nEmp') {
        const emp = sale.employee || sale.empleado;
        return `${emp?.nombres} ${emp?.apellidos}`.toLowerCase().includes(query);
      }
      if (filterType === 'nCli') {
        const cli = sale.customer || sale.cliente;
        return `${cli?.nombres} ${cli?.apellidos}`.toLowerCase().includes(query);
      }
      if (filterType === 'nProd') {
        return (sale.productos || '').toLowerCase().includes(query);
      }

      return true;
    });
  }, [sales, startDate, endDate, filterType, searchQuery]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [filterType, startDate, endDate, searchQuery, sales.length]);

  // Efecto para restablecer las fechas cuando se cambia de "Fecha Única" a otro filtro
  const prevFilterTypeRef = useRef(filterType);
  useEffect(() => {
    if (prevFilterTypeRef.current === 'single' && filterType !== 'single') {
      const { startStr, endStr } = getDefaultDates();
      setStartDate(startStr);
      setEndDate(endStr);
    }
    prevFilterTypeRef.current = filterType;
  }, [filterType]);

  const paginatedSales = React.useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSales, page]);

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);

  const handlePageChange = (event, value) => {
    setPage(value);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectSale = React.useCallback((sale) => {
    setSelectedItem(prev => prev?.id === sale.id ? null : sale);
  }, [setSelectedItem]);

  const handleShowDetails = React.useCallback(async (e, sale) => {
    e.stopPropagation(); // Evitar que se seleccione la card al hacer clic en el botón
    if (e.currentTarget) e.currentTarget.blur();

    setSelectedSale(sale);
    setDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
      const token = user?.token;

      const response = await fetch(`${API_BASE_URL}/detalles-ventas/${sale.id}`, {
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
        setSaleDetails(data);
      }
    } catch (err) {
      console.error('Error al obtener detalles:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid size={12}>
        <Card sx={{ width: '100%', background: 'transparent' }} elevation={0}>
          <CardContent className='tarjeta-contenido'>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffffff' }}>Ventas</Typography>
              <Typography sx={{ color: '#9f9f9fff' }}>Módulo de Ventas</Typography>
            </Box>

            {/* Contenedor de Filtros Moderno */}
            <Paper
              elevation={0}
              sx={{
                mb: 4,
                p: { xs: 2.5, sm: 3 },
                borderRadius: '24px',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(157, 0, 0, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: '15%',
                left: 0,
                width: '4px',
                height: '70%',
                background: 'linear-gradient(to bottom, #9d0000, #640c0c)',
                borderRadius: '0 4px 4px 0'
              }} />

              {/* Fila Superior: Info y Fechas */}
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center',
                gap: 3
              }}>
                {/* Info y Contador */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, width: { xs: '100%', md: 'auto' } }}>
                  <Box sx={{
                    p: 1.5,
                    borderRadius: '14px',
                    bgcolor: 'rgba(157, 0, 0, 0.08)',
                    color: '#9d0000',
                    display: 'flex'
                  }}>
                    <TuneIcon />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      Registros
                      <Chip label={filteredSales.length} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#9d0000', color: '#fff', fontWeight: 900 }} />
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                      Control de ingresos
                    </Typography>
                  </Box>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, mx: 1, borderColor: 'rgba(0,0,0,0.06)' }} />

                {/* Filtros de Fecha */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  width: '100%',
                  flexWrap: { xs: 'wrap', sm: 'nowrap' }
                }}>
                  <TextField
                    type="date"
                    label={filterType === 'single' ? "Fecha exacta" : "Desde"}
                    value={startDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val < minDate || val > maxDate) return;
                      setStartDate(val);
                    }}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      flexGrow: 1,
                      maxWidth: { md: filterType === 'single' ? '350px' : 'none' },
                      '& .MuiOutlinedInput-root': { borderRadius: '14px', bgcolor: '#fff' }
                    }}
                  />

                  {filterType !== 'single' && (
                    <>
                      <ArrowForwardIcon sx={{ color: '#aaa', display: { xs: 'none', sm: 'block' } }} />
                      <TextField
                        type="date"
                        label="Hasta"
                        value={endDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val < minDate || val > maxDate) return;
                          setEndDate(val);
                        }}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          flexGrow: 1,
                          '& .MuiOutlinedInput-root': { borderRadius: '14px', bgcolor: '#fff' }
                        }}
                      />
                    </>
                  )}
                </Box>
              </Box>

              {/* Fila Inferior: Criterio y Búsqueda */}
              <Box sx={{
                display: 'flex',
                gap: 2,
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center'
              }}>
                <TextField
                  select
                  label="Filtrar por"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  size="small"
                  sx={{
                    minWidth: { xs: '100%', md: 200 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '14px',
                      bgcolor: '#fff',
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9d0000' }
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterListIcon sx={{ color: '#9d0000', fontSize: '1.2rem' }} />
                      </InputAdornment>
                    ),
                    sx: { color: 'black', fontWeight: 500 }
                  }}
                >
                  <MenuItem value="nEmp">Por Empleado</MenuItem>
                  <MenuItem value="nCli">Por Cliente</MenuItem>
                  <MenuItem value="nProd">Por Producto</MenuItem>
                  <MenuItem value="single">Fecha Única</MenuItem>
                </TextField>

                {['nEmp', 'nCli', 'nProd'].includes(filterType) && (
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder={`Buscar ${filterType === 'nEmp' ? 'empleado' : filterType === 'nCli' ? 'cliente' : 'producto'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '14px',
                        bgcolor: '#fff',
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9d0000' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#9d0000', borderWidth: '2px' }
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#aaa' }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <CloseIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { color: 'black' }
                    }}
                  />
                )}

                {/* Botón de Limpieza General */}
                {(searchQuery || filterType !== 'nEmp') && (
                  <Tooltip title="Restablecer filtros">
                    <IconButton
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('nEmp');
                        const { startStr, endStr } = getDefaultDates();
                        setStartDate(startStr);
                        setEndDate(endStr);
                      }}
                      sx={{
                        color: '#9d0000',
                        bgcolor: 'rgba(157,0,0,0.05)',
                        '&:hover': { bgcolor: 'rgba(157,0,0,0.1)' },
                        ml: { md: 'auto' }
                      }}
                    >
                      <ClearAllIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Paper>

            <Box
              ref={containerRef}
              className="sales-grid"
              sx={{
                maxHeight: 'calc(100vh - 420px)',
                minHeight: '400px',
                overflowY: 'auto',
                pr: 1,
                mb: 2,
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
                '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(0,0,0,0.2)' }
              }}
            >
              {paginatedSales.map((sale, index) => (
                <SaleCard
                  key={sale.id}
                  sale={sale}
                  index={index}
                  isSelected={selectedItem?.id === sale.id}
                  onSelect={handleSelectSale}
                  onShowDetails={handleShowDetails}
                />
              ))}
            </Box>

            {/* Controles de Paginación */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                      '&.Mui-selected': {
                        bgcolor: '#9d0000',
                        color: '#fff',
                        '&:hover': { bgcolor: '#640c0c' }
                      }
                    }
                  }}
                />
              </Box>
            )}

            <TableStatus
              loading={loading}
              error={error}
              loadingMessage="Cargando Ventas..."
              errorMessage={`Error al obtener las Ventas: ${error}`}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Modal de Detalles de Venta */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ className: 'custom-modal-paper' }}
        slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
        disableRestoreFocus
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
              Detalles de Venta
            </Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Venta #{selectedSale?.id} - {selectedSale && (() => {
                const [year, month, day] = selectedSale.fechaRegistro.split('T')[0].split(' ')[0].split('-');
                return `${day}/${month}/${year}`;
              })()}
            </Typography>
          </Box>
          <IconButton onClick={() => setDetailsOpen(false)} sx={{ color: '#1a1a1a' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: '#9d0000' }} />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)' }}>Producto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)' }}>Tipo Paq.</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)' }}>Cant. Paq</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)' }}>Cant. Uni</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)' }}>Precio</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: 'clamp(0.7rem, 1.5vw, 0.9rem)' }}>Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {saleDetails.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)' }}>{item.producto?.nombre || `Prod #${item.id_producto}`}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)' }}>{item.producto?.tipoPaquete || '-'}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)' }}>{item.cantidadPaquetes}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)' }}>{item.cantidadUnidades}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)' }}>C$ {Number(item.precioUnitario).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)' }}>C$ {Number(item.subtotal).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {saleDetails.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#999' }}>
                        No hay detalles registrados para esta venta
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {selectedSale && !loadingDetails && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" display="block" sx={{ color: '#666', fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)' }}><b>Cliente:</b><br /> {selectedSale.cliente.nombres} {selectedSale.cliente.apellidos}</Typography>
                <Typography variant="caption" display="block" sx={{ color: '#666', fontSize: 'clamp(0.7rem, 1.4vw, 0.85rem)' }}><b>Atendido por:</b><br /> {selectedSale.empleado.nombres} {selectedSale.empleado.apellidos}</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontSize: 'clamp(1cqw, 4cqw, 25px)', fontWeight: 800, color: '#9d0000' }}>
                Total:<br />C$ {Number(selectedSale.totalVenta).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.01)' }}>
          <Button
            onClick={() => setDetailsOpen(false)}
            variant="contained"
            sx={{
              borderRadius: '10px',
              bgcolor: '#1a1a1a',
              '&:hover': { bgcolor: '#333' },
              textTransform: 'none',
              px: 4
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default Sales;
