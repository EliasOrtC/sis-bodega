import React, { memo, useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Grid, TextField, MenuItem, Paper, Box, Pagination, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Divider, InputAdornment, Chip, Tooltip } from '@mui/material';
import { useSelection } from '../context/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';
import TableStatus from '../components/common/TableStatus.jsx';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import TuneIcon from '@mui/icons-material/Tune';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import '../styles/EmployeeCards.css';

const Employees = () => {
  const { selectedItem, setSelectedItem } = useSelection();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewedEmployee, setViewedEmployee] = useState(null);
  const [filterType, setFilterType] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const containerRef = useRef(null);

  const {
    data: employees,
    loading,
    error
  } = useTableData('empleados', 'employeesUpdated', selectedItem, setSelectedItem);

  // Filtrado de empleados
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    const query = searchQuery.toLowerCase();

    return employees.filter(emp => {
      if (!query) return true;
      const fullName = `${emp.nombres} ${emp.apellidos}`.toLowerCase();
      const cedula = (emp.numCedula || '').toLowerCase();
      const sector = (emp.sector || '').toLowerCase();
      const estado = (emp.estado || '').toLowerCase();

      if (filterType === 'name') return fullName.includes(query);
      if (filterType === 'cedula') return cedula.includes(query);
      if (filterType === 'sector') return sector.includes(query);
      if (filterType === 'status') return estado.includes(query);

      // 'all' filter
      return fullName.includes(query) || cedula.includes(query) || sector.includes(query) || estado.includes(query);
    });
  }, [employees, filterType, searchQuery]);

  // Paginación
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, page]);

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

  const handleShowDetails = (e, employee) => {
    e.stopPropagation();
    setViewedEmployee(employee);
    setDetailsOpen(true);
  };

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid item xs={12}>
        <Card sx={{ width: '100%', background: 'transparent', boxShadow: 'none' }} className='tarjeta'>
          <CardContent className='tarjeta-contenido'>
            <Box sx={{ mb: 2, px: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Empleados</Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>Módulo de gestión de recursos humanos</Typography>
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
                    <Chip label={filteredEmployees.length} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#9d0000', color: '#fff', fontWeight: 900 }} />
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                    Gestiona tu personal
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
                  <MenuItem value="name">Por Nombre</MenuItem>
                  <MenuItem value="cedula">Por Cédula</MenuItem>
                  <MenuItem value="sector">Por Sector</MenuItem>
                  <MenuItem value="status">Por Estado</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Escribe para buscar empleado..."
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

            <Box
              ref={containerRef}
              className="employee-grid"
            >
              {paginatedEmployees.map((employee, index) => {
                const fullName = `${employee.nombres} ${employee.apellidos}`;
                const supervisorName = employee.supervisor
                  ? `${employee.supervisor.nombres} ${employee.supervisor.apellidos}`
                  : 'Sin asignar';

                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=9d0000&color=fff&size=200&font-size=0.4`;
                const isActive = employee.estado?.toLowerCase().includes('activo');

                return (
                  <div
                    key={employee.id}
                    className={`employee-card ${selectedItem?.id === employee.id ? 'selected' : ''}`}
                    onClick={() => setSelectedItem(selectedItem?.id === employee.id ? null : employee)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="employee-card-image-container">
                      <img src={avatarUrl} alt={fullName} className="employee-card-image" />
                    </div>

                    <div className="employee-card-content">
                      <div className={`employee-status-badge ${isActive ? 'status-activo' : 'status-inactivo'}`}>
                        {employee.estado || 'INACTIVO'}
                      </div>

                      <div className="employee-barcode" title="Ver Información Completa" onClick={(e) => handleShowDetails(e, employee)} />

                      <div className="employee-name" title={fullName}>{fullName}</div>

                      <div className="employee-detail-grid">
                        <div className="employee-detail-row" title={`Cédula: ${employee.numCedula}`}>
                          <BadgeIcon fontSize="small" />
                          <span className="employee-detail-text">{employee.numCedula || 'S/N'}</span>
                        </div>
                        <div className="employee-detail-row" title={`Sector: ${employee.sector}`}>
                          <WorkIcon fontSize="small" />
                          <span className="employee-detail-text">{employee.sector || 'General'}</span>
                        </div>
                        <div className="employee-detail-row" title={`Supervisor: ${supervisorName}`}>
                          <AccountTreeIcon fontSize="small" />
                          <span className="employee-detail-text">{supervisorName}</span>
                        </div>
                        <div className="employee-detail-row" title={`Inicio: ${employee.fechaDeInicioContrato}`}>
                          <CalendarMonthIcon fontSize="small" />
                          <span className="employee-detail-text">{employee.fechaDeInicioContrato || 'S/F'}</span>
                        </div>
                        <div className="employee-detail-row" title={`Sexo: ${employee.sexo} | Est. Civil: ${employee.estadoCivil}`}>
                          <PersonIcon fontSize="small" />
                          <span className="employee-detail-text">{employee.sexo || '-'} | {employee.estadoCivil || '-'}</span>
                        </div>
                      </div>

                      <div className="employee-salary">
                        <span className='sb-salary' style={{ fontSize: '0.7rem', opacity: 0.6, display: 'block' }}>SALARIO BASE</span>
                        <div style={{ display: 'flex', alignItems: 'center', color: '#166534' }}>
                          C$ <span>{parseFloat(employee.salarioBase || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</span>
                        </div>
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
              loadingMessage="Cargando Empleados..."
              errorMessage={`Error al obtener los Empleados: ${error}`}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Modal de Detalles del Empleado */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: 'custom-modal-paper' }}
        slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#9d0000' }}>Perfil del Empleado</Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>Expediente #{viewedEmployee?.id}</Typography>
          </Box>
          <IconButton onClick={() => setDetailsOpen(false)} sx={{ color: '#1a1a1a' }}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: 'rgba(0,0,0,0.05)', pb: 3, bgcolor: '#f8fafc' }}>
          {viewedEmployee && (
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ display: 'flex', gap: 3, mb: 3, alignItems: 'center' }}>
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(viewedEmployee.nombres + ' ' + viewedEmployee.apellidos)}&background=9d0000&color=fff&size=200`}
                  alt="Avatar"
                  style={{ width: '80px', height: '80px', borderRadius: '12px', border: '2px solid #9d0000' }}
                />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{viewedEmployee.nombres} {viewedEmployee.apellidos}</Typography>
                  <Typography variant="body2" color="text.secondary">{viewedEmployee.sector}</Typography>
                </Box>
              </Box>

              <div className={`employee-status-badge ${viewedEmployee.estado?.toLowerCase().includes('activo') ? 'status-activo' : 'status-inactivo'}`} style={{ position: 'absolute', top: 0, right: 0 }}>
                {viewedEmployee.estado || 'INACTIVO'}
              </div>

              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}><Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#9d0000', mb: 1 }}>DOCUMENTOS Y LEGAL</Typography></Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Número de Cédula</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FingerprintIcon fontSize="small" sx={{ color: '#9d0000' }} /> <Typography variant="body2">{viewedEmployee.numCedula || 'N/A'}</Typography></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">RUC</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AssignmentIndIcon fontSize="small" sx={{ color: '#9d0000' }} /> <Typography variant="body2">{viewedEmployee.ruc || 'N/A'}</Typography></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Número INSS</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><BadgeIcon fontSize="small" sx={{ color: '#9d0000' }} /> <Typography variant="body2">{viewedEmployee.numInss || 'N/A'}</Typography></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Estado Civil</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonIcon fontSize="small" sx={{ color: '#9d0000' }} /> <Typography variant="body2">{viewedEmployee.estadoCivil || 'N/A'}</Typography></Box>
                </Grid>

                <Grid item xs={12}><Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#9d0000', mb: 1, mt: 1 }}>CONTRATO Y SUPERVISIÓN</Typography></Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Inicio de Contrato</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CalendarMonthIcon fontSize="small" sx={{ color: '#9d0000' }} /> <Typography variant="body2">{viewedEmployee.fechaDeInicioContrato || 'N/A'}</Typography></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Fin de Contrato</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CalendarMonthIcon fontSize="small" sx={{ color: '#9d0000' }} /> <Typography variant="body2">{viewedEmployee.fechaDeFinContrato || 'Indefinido'}</Typography></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Supervisor</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AccountTreeIcon fontSize="small" sx={{ color: '#9d0000' }} /> <Typography variant="body2">{viewedEmployee.supervisor ? `${viewedEmployee.supervisor.nombres} ${viewedEmployee.supervisor.apellidos}` : 'Sin Supervisor'}</Typography></Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Sexo</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonIcon fontSize="small" sx={{ color: '#9d0000' }} /> <Typography variant="body2">{viewedEmployee.sexo || 'N/A'}</Typography></Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(157,0,0,0.05)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed #9d0000' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#9d0000' }}>SALARIO BASE:</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#166534' }}>
                      C$ {parseFloat(viewedEmployee.salarioBase || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setDetailsOpen(false)} variant="contained" sx={{ borderRadius: '10px', bgcolor: '#9d0000', '&:hover': { bgcolor: '#640c0c' }, textTransform: 'none', px: 4 }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default memo(Employees);
