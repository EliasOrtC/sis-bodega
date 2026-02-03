import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, TextField, MenuItem, Paper, Box, Pagination, InputAdornment, Chip, Tooltip, IconButton, Divider } from '@mui/material';
import { useSelection } from '../context/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';
import TableStatus from '../components/common/TableStatus.jsx';
import { validateAndIdentifyPhone } from '../utils/phoneUtils';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BadgeIcon from '@mui/icons-material/Badge';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import TuneIcon from '@mui/icons-material/Tune';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import '../styles/ClientCards.css';

const Clients = () => {
  const { selectedItem, setSelectedItem } = useSelection();
  const [filterType, setFilterType] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const containerRef = useRef(null);

  const {
    data: clients,
    loading,
    error,
  } = useTableData('clientes', 'clientsUpdated', selectedItem, setSelectedItem);

  // Filtrado de clientes
  const filteredClients = useMemo(() => {
    if (!Array.isArray(clients)) return [];
    const query = searchQuery.toLowerCase();

    return clients.filter(client => {
      if (!query) return true;
      const fullName = `${client.nombres} ${client.apellidos}`.toLowerCase();
      const cedula = (client.numCedula || '').toLowerCase();
      const phone = (client.telefono || '').toLowerCase();
      const direccion = (client.direccion || '').toLowerCase();

      if (filterType === 'name') return fullName.includes(query);
      if (filterType === 'cedula') return cedula.includes(query);
      if (filterType === 'phone') return phone.includes(query);
      if (filterType === 'direccion') return direccion.includes(query);

      return fullName.includes(query) || cedula.includes(query) || phone.includes(query) || direccion.includes(query);
    });
  }, [clients, filterType, searchQuery]);

  // Paginación
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredClients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClients, page]);

  // Resetear página al filtrar
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterType]);

  const handlePageChange = (event, value) => {
    setPage(value);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid item xs={12}>
        <Card sx={{ width: '100%', background: 'transparent', boxShadow: 'none' }} className='tarjeta'>
          <CardContent className='tarjeta-contenido'>
            {/* Header Section */}
            <Box sx={{ mb: 2, px: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Clientes</Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>Módulo de gestión de clientes</Typography>
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
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: '20%',
                left: 0,
                width: '4px',
                height: '60%',
                background: 'linear-gradient(to bottom, #9d0000, #640c0c)',
                borderRadius: '0 4px 4px 0'
              }} />

              {/* Información y Contador */}
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
                    Búsqueda
                    <Chip label={filteredClients.length} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#9d0000', color: '#fff', fontWeight: 900 }} />
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                    Directorio de Clientes
                  </Typography>
                </Box>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, mx: 1, borderColor: 'rgba(0,0,0,0.06)' }} />

              {/* Inputs Integrados */}
              <Box sx={{
                display: 'flex',
                flexGrow: 1,
                width: '100%',
                gap: 1.5,
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
                <TextField
                  select
                  label="Filtrar por"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  size="small"
                  sx={{
                    minWidth: { sm: 180 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '14px',
                      bgcolor: '#fff',
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#9d0000' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#9d0000' }
                    },
                    '& .MuiInputLabel-root': { color: '#666' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#9d0000' }
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
                  <MenuItem value="direccion">Dirección / Sector</MenuItem>
                  <MenuItem value="name">Por Nombre</MenuItem>
                  <MenuItem value="cedula">Por Cédula</MenuItem>
                  <MenuItem value="phone">Por Teléfono</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Escribe para buscar cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{
                    flexGrow: 1,
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
                        <Tooltip title="Limpiar búsqueda">
                          <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <CloseIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                    sx: { color: 'black' }
                  }}
                />
              </Box>

              {/* Botón de Limpieza General */}
              {(searchQuery || filterType !== 'name') && (
                <Tooltip title="Restablecer filtros">
                  <IconButton
                    onClick={() => { setSearchQuery(''); setFilterType('name'); }}
                    sx={{
                      color: '#9d0000',
                      bgcolor: 'rgba(157,0,0,0.05)',
                      '&:hover': { bgcolor: 'rgba(157,0,0,0.1)' }
                    }}
                  >
                    <ClearAllIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Paper>

            {/* Clients Grid */}
            <Box
              ref={containerRef}
              className="client-grid"
            >
              {paginatedClients.map((client, index) => {
                const phoneInfo = validateAndIdentifyPhone(client.telefono);
                const fullName = `${client.nombres} ${client.apellidos}`;
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=9d0000&color=fff&size=200&font-size=0.4`;

                return (
                  <div
                    key={client.id}
                    className={`client-card ${selectedItem?.id === client.id ? 'selected' : ''}`}
                    onClick={() => setSelectedItem(selectedItem?.id === client.id ? null : client)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="client-card-image-container">
                      <img src={avatarUrl} alt={fullName} className="client-card-image" />
                    </div>

                    <div className="client-card-content">
                      <div className="client-name" title={fullName}>{fullName}</div>
                      <div className="client-detail-row" title={client.numCedula}>
                        <BadgeIcon fontSize="small" />
                        <span className="client-detail-text">{client.numCedula || 'S/N'}</span>
                      </div>
                      <div className="client-detail-row" title={client.correo}>
                        <EmailIcon fontSize="small" />
                        <span className="client-detail-text">{client.correo || 'No registrado'}</span>
                      </div>
                      <div className="client-detail-row" title={client.telefono}>
                        <PhoneIcon fontSize="small" />
                        <span className="client-detail-text">{client.telefono}</span>
                        {phoneInfo.carrierLogo && (
                          <img src={phoneInfo.carrierLogo} alt={phoneInfo.carrier} style={{ height: '14px', marginLeft: '6px', borderRadius: '2px' }} />
                        )}
                      </div>
                      <div className="client-detail-row" title={client.direccion}>
                        <LocationOnIcon fontSize="small" />
                        <span className="client-detail-text">{client.direccion || 'Sin dirección'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Box>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      color: '#000',
                      bgcolor: 'rgba(255,255,255,0.7)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                      '&.Mui-selected': { bgcolor: '#9d0000', color: '#fff' }
                    }
                  }}
                />
              </Box>
            )}

            <TableStatus
              loading={loading}
              error={error}
              loadingMessage="Cargando Clientes..."
              errorMessage={`Error al obtener los Clientes: ${error}`}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Clients;
