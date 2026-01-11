import React, { useRef, useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Grid, Paper, Box, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, IconButton, Pagination
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import CloseIcon from '@mui/icons-material/Close';
import { useSelection } from '../context/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';
import TableStatus from '../components/common/TableStatus.jsx';
import { API_BASE_URL } from '../utils/config';
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

  // Estados para el filtro de fechas
  const [filterType, setFilterType] = useState('nEmp'); // 'single' | 'range'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para el modal de detalles
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados para paginación
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Efecto para establecer el rango por defecto
  useEffect(() => {
    if (sales.length > 0 && !startDate && !endDate) {
      const today = new Date();
      // Obtener el primer día del mes anterior
      const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      // Formatear manualmente a YYYY-MM-DD para evitar desfases de zona horaria
      const year = firstDayPrevMonth.getFullYear();
      const month = String(firstDayPrevMonth.getMonth() + 1).padStart(2, '0');
      const day = '01';
      const formattedStartDate = `${year}-${month}-${day}`;

      setStartDate(formattedStartDate);

      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setEndDate(localToday);
    }
  }, [sales, startDate, endDate]);

  // Filtrar ventas de forma eficiente (Memoizado)
  const filteredSales = React.useMemo(() => {
    if (!Array.isArray(sales)) return [];
    if (!startDate) return sales;

    const startStr = startDate;
    const endStr = endDate || new Date().toISOString().split('T')[0];

    return sales.filter(sale => {
      // Obtener el string YYYY-MM-DD en hora LOCAL para que coincida con lo que se muestra
      const dateObj = new Date(sale.fechaRegistro);
      const localYear = dateObj.getFullYear();
      const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const localDay = String(dateObj.getDate()).padStart(2, '0');
      const saleDateStr = `${localYear}-${localMonth}-${localDay}`;

      const isInDateRange = filterType === 'single'
        ? saleDateStr === startStr
        : (saleDateStr >= startStr && saleDateStr <= endStr);

      if (!isInDateRange) return false;

      // Filtros de búsqueda por texto
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      if (filterType === 'nEmp') {
        const empName = `${sale.employee?.nombres || sale.empleado.nombres} ${sale.employee?.apellidos || sale.empleado.apellidos}`.toLowerCase();
        return empName.includes(query);
      }
      if (filterType === 'nCli') {
        const cliName = `${sale.customer?.nombres || sale.cliente.nombres} ${sale.customer?.apellidos || sale.cliente.apellidos}`.toLowerCase();
        return cliName.includes(query);
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

  const handleShowDetails = async (e, sale) => {
    e.stopPropagation(); // Evitar que se seleccione la card al hacer clic en el botón
    setSelectedSale(sale);
    setDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const response = await fetch(`${API_BASE_URL}/detalles-ventas/${sale.id}`);
      if (response.ok) {
        const data = await response.json();
        setSaleDetails(data);
      }
    } catch (err) {
      console.error('Error al obtener detalles:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid item xs={12}>
        <Card sx={{ width: '100%', background: 'transparent' }} elevation={0}>
          <CardContent className='tarjeta-contenido'>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffffff' }}>Ventas</Typography>
              <Typography sx={{ color: '#9f9f9fff' }}>Módulo de Ventas</Typography>
            </Box>

            {/* Box de Filtros Moderno - Estilo Claro */}
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 3,
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                display: 'flex',
                gap: 3,
                alignItems: 'center',
                flexWrap: 'wrap',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                background: 'linear-gradient(to top, #640c0c, #9d0000)'
              }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', color: '#1a1a1a' }}>
                  Filtros
                </Typography>
              </Box>

              <TextField
                select
                label="Filtrar por"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                sx={{ minWidth: 180 }}
                size="small"
                variant="outlined"
                InputProps={{
                  sx: { borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 1)', color: '#1a1a1a' }
                }}
                InputLabelProps={{
                  sx: { color: '#555' }
                }}
              >
                <MenuItem value="nEmp">Empleado</MenuItem>
                <MenuItem value="nCli">Cliente</MenuItem>
                <MenuItem value="nProd">Producto</MenuItem>
                <MenuItem value="single">Fecha Única</MenuItem>
              </TextField>

              <TextField
                type="date"
                label={filterType === 'single' ? "Fecha" : "Desde"}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true, sx: { color: '#555' } }}
                size="small"
                InputProps={{
                  sx: { borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 1)', color: '#1a1a1a' }
                }}
              />

              {filterType !== 'single' && (
                <>
                  <Typography variant="body2" sx={{ color: '#1a1a1a', fontWeight: 'bold' }}>→</Typography>
                  <TextField
                    type="date"
                    label="Hasta"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true, sx: { color: '#555' } }}
                    size="small"
                    InputProps={{
                      sx: { borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 1)', color: '#1a1a1a' }
                    }}
                  />
                </>
              )}

              {['nEmp', 'nCli', 'nProd'].includes(filterType) && (
                <TextField
                  label={
                    filterType === 'nEmp' ? "Buscar Empleado..." :
                      filterType === 'nCli' ? "Buscar Cliente..." :
                        "Buscar Producto..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{ minWidth: 280, ml: 'auto', '@media (max-width: 768px)': { ml: 0 } }}
                  variant="outlined"
                  InputProps={{
                    sx: { borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 1)', color: '#1a1a1a' }
                  }}
                />
              )}
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
                <Card
                  key={sale.id}
                  className={`sale-card ${selectedItem?.id === sale.id ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(selectedItem?.id === sale.id ? null : sale)}
                  style={{
                    animation: `cardEntrance 0.4s ease forwards ${index * 0.05}s`,
                    opacity: 0
                  }}
                >
                  <CardContent sx={{ p: '24px !important' }}>
                    <Box className="sale-card-header">
                      <Typography className="sale-date">
                        {(() => {
                          const [year, month, day] = sale.fechaRegistro.split('T')[0].split(' ')[0].split('-');
                          return `${day}/${month}/${year}`;
                        })()}
                      </Typography>
                      <Box
                        className="sale-icon-container"
                        sx={{ cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' } }}
                        onClick={(e) => handleShowDetails(e, sale)}
                      >
                        <ReceiptLongIcon sx={{ color: 'white' }} />
                      </Box>
                    </Box>

                    <Box className="sale-info-row" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <PersonIcon sx={{ color: 'black', fontSize: '1.2rem' }} />
                      <Box>
                        <Typography className="sale-info-label">Cliente</Typography>
                        <Typography className="sale-info-value">
                          {sale.cliente.nombres} {sale.cliente.apellidos}
                        </Typography>
                      </Box>
                    </Box>

                    <Box className="sale-info-row" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <BadgeIcon sx={{ color: 'black', fontSize: '1.2rem' }} />
                      <Box>
                        <Typography className="sale-info-label">Atendido por</Typography>
                        <Typography className="sale-info-value" sx={{ fontSize: '0.9rem' }}>
                          {sale.empleado.nombres} {sale.empleado.apellidos}
                        </Typography>
                      </Box>
                    </Box>

                    <Box className="sale-total-section">
                      <Typography className="sale-total-label">Total Venta</Typography>
                      <Typography className="sale-total-amount">
                        C$ {Number(sale.totalVenta).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
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
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }
        }}
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
                    <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Tipo Paq.</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Cant. Paq</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Cant. Uni</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Precio</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {saleDetails.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.producto?.nombre || `Prod #${item.id_producto}`}</TableCell>
                      <TableCell align="center">{item.producto?.tipoPaquete || '-'}</TableCell>
                      <TableCell align="center">{item.cantidadPaquetes}</TableCell>
                      <TableCell align="center">{item.cantidadUnidades}</TableCell>
                      <TableCell align="right">C$ {Number(item.precioUnitario).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>C$ {Number(item.subtotal).toFixed(2)}</TableCell>
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
                <Typography variant="caption" display="block" sx={{ color: '#666' }}>Cliente: {selectedSale.cliente.nombres} {selectedSale.cliente.apellidos}</Typography>
                <Typography variant="caption" display="block" sx={{ color: '#666' }}>Atendido por: {selectedSale.empleado.nombres} {selectedSale.empleado.apellidos}</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#9d0000' }}>
                Total: C$ {Number(selectedSale.totalVenta).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
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
