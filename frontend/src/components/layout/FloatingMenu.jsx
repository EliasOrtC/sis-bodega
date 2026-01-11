import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Fab, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Button, useMediaQuery, useTheme, Typography,
  Collapse, Tooltip, Slide, Zoom
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useSelection } from '../../context/SelectionContext.jsx';
import '../../styles/FloatingMenu.css';
import SuccessModal from '../common/SuccessModal.jsx';
import LoadingOverlay from '../common/LoadingOverlay.jsx';
import '../../styles/Modales.css';


import { API_BASE_URL } from '../../utils/config';
import useFloatingMenuData from '../../hooks/useFloatingMenuData.js';
import ModalFormManager from '../forms/ModalFormManager.jsx';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Zoom ref={ref} {...props} />;
});

const FloatingMenu = ({ onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedItem, setSelectedItem } = useSelection();
  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Consolidated for data fetching
  const { empleados, clientes, supervisores, proveedores, productos } = useFloatingMenuData(location.pathname);
  const catalogs = { empleados, clientes, supervisores, proveedores, productos };

  const formRef = useRef(null);
  const editFormRef = useRef(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [modalType, setModalType] = useState('success');
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const toggleMenu = () => setIsOpen(!isOpen);
  const handleLogout = () => onLogout();

  const handleSettings = () => {
    navigate('/configuracion');
  };

  const handleAdd = () => {
    setModalOpen(true);
  };

  const handleEdit = async () => {
    if (selectedItem) {
      setEditModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
  };

  const handleFormSubmit = async (submissionData) => {
    const { formData, cartItems, calculatedTotal } = submissionData;
    setLoading(true);
    // Simular carga min para feedback visual
    await new Promise(resolve => setTimeout(resolve, 500));

    const path = location.pathname;
    let endpoint = '';
    let data = {};

    // Determine if it is an edit or add operation based on which modal is open
    // NOTE: This could be improved by passing a flag, but this works given standard usage
    const isEdit = editModalOpen;
    const currentId = isEdit ? selectedItem?.id : null;

    // Get current user from storage
    const userStored = localStorage.getItem('user') || sessionStorage.getItem('user');
    const currentUser = userStored ? JSON.parse(userStored) : { id: null, username: 'Desconocido' };

    try {
      switch (path) {
        case '/ventas':
          if (cartItems.length === 0) {
            throw new Error('Agrega al menos un producto al carrito');
          }
          endpoint = isEdit ? `${API_BASE_URL}/ventas/${currentId}` : `${API_BASE_URL}/ventas`;
          data = {
            id_empleado: submissionData.id_empleado,
            id_cliente: submissionData.id_cliente,
            fechaRegistro: formData.fechaRegistro || '',
            totalVenta: parseFloat(calculatedTotal),
            userId: currentUser.id,
            username: currentUser.username
          };
          break;
        case '/clientes':
          endpoint = isEdit ? `${API_BASE_URL}/clientes/${currentId}` : `${API_BASE_URL}/clientes`;
          data = {
            nombres: formData.nombres || '',
            apellidos: formData.apellidos || '',
            correo: formData.correo || '',
            telefono: formData.telefono || '',
            fechaRegistro: formData.fechaRegistro || '',
            numCedula: formData.numCedula || '',
            direccion: formData.direccion || '',
            userId: currentUser.id,
            username: currentUser.username
          };
          break;
        case '/empleados':
          endpoint = isEdit ? `${API_BASE_URL}/empleados/${currentId}` : `${API_BASE_URL}/empleados`;
          data = {
            nombres: formData.nombres || '',
            apellidos: formData.apellidos || '',
            estadoCivil: formData.estadoCivil || '',
            sexo: formData.sexo || '',
            fechaDeNacimiento: formData.fechaDeNacimiento || '',
            fechaDeInicioContrato: formData.fechaDeInicioContrato || '',
            fechaDeFinContrato: formData.fechaDeFinContrato || '',
            ruc: formData.ruc || '',
            numCedula: formData.numCedula || '',
            numInss: formData.numInss || '',
            estado: formData.estado || '',
            sector: formData.sector || '',
            supervisor: submissionData.selectedSupervisor ? submissionData.selectedSupervisor.id : null,
            Supervisor: submissionData.selectedSupervisor ? submissionData.selectedSupervisor.id : null, // For compatibility
            salarioBase: parseFloat(formData.salarioBase) || 0,
            userId: currentUser.id,
            username: currentUser.username
          };
          break;
        case '/compras':
          endpoint = isEdit ? `${API_BASE_URL}/compras/${currentId}` : `${API_BASE_URL}/compras`;
          data = {
            fechaDeCompra: formData.fechaDeCompra || '',
            id_proveedor: submissionData.id_proveedor,
            totalCompra: parseFloat(formData.totalCompra) || 0,
            userId: currentUser.id,
            username: currentUser.username
          };
          break;
        case '/inventario':
          endpoint = isEdit ? `${API_BASE_URL}/inventario/${currentId}` : `${API_BASE_URL}/inventario`;
          data = {
            nombre: formData.nombre || '',
            tipoPaquete: parseInt(formData.tipoPaquete) || 6,
            inventario: Number(((parseInt(formData.cantidadPaquetes) || 0) + ((parseInt(formData.cantidadUnidades) || 0) / (parseInt(formData.tipoPaquete) || 6))).toFixed(3)),
            cantidadUnidades: parseInt(formData.cantidadUnidades) || 0,
            cantidadPaquetes: parseInt(formData.cantidadPaquetes) || 0,
            precioVenta_Paq: parseFloat(formData.precioVenta_Paq) || 0,
            precioCompra_Paq: parseFloat(formData.precioCompra_Paq) || 0,
            userId: currentUser.id,
            username: currentUser.username
          };
          // Validación: cantidadUnidades <= tipoPaquete
          if (data.cantidadUnidades > data.tipoPaquete) {
            throw new Error('Las unidades no pueden superar al tipo de paquete');
          }
          break;
        default:
          setLoading(false);
          return;
      }

      const method = isEdit ? 'PUT' : 'POST';
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Handle Sales Details
        if (path === '/ventas') {
          const id_venta = isEdit ? currentId : (await response.json()).id_venta;

          if (isEdit) {
            // Actualización eficiente: comparar y actualizar solo lo necesario
            const updateResponse = await fetch(`${API_BASE_URL}/detalles-ventas/update`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id_venta: id_venta,
                userId: currentUser.id,
                username: currentUser.username,
                detalles: cartItems.map(item => ({
                  id: item.id || null, // Incluir ID si existe (para UPDATE), null si es nuevo (para INSERT)
                  id_producto: item.id_producto,
                  cantidadPaquetes: item.cantidadPaquetes,
                  cantidadUnidades: item.cantidadUnidades,
                  precioUnitario: item.precioUnitario,
                  subtotal: item.subtotal
                }))
              })
            });

            if (!updateResponse.ok) {
              throw new Error('Venta actualizada pero error al actualizar detalles');
            }
          } else {
            // Agregar detalles nuevos (solo para ventas nuevas)
            const detallesResponse = await fetch(`${API_BASE_URL}/detalles-ventas/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id_venta: id_venta,
                userId: currentUser.id,
                username: currentUser.username,
                detalles: cartItems.map(item => ({
                  id_producto: item.id_producto,
                  cantidadPaquetes: item.cantidadPaquetes,
                  cantidadUnidades: item.cantidadUnidades,
                  precioUnitario: item.precioUnitario,
                  subtotal: item.subtotal
                }))
              }),
            });

            if (!detallesResponse.ok) {
              throw new Error('Venta guardada pero error al guardar detalles');
            }
          }
        }

        setModalOpen(false);
        setEditModalOpen(false);
        if (isEdit) setSelectedItem(null);

        setSuccessMessage(isEdit ? 'Registro actualizado correctamente' : 'Registro agregado correctamente');
        setModalType('success');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 2000);

      } else {
        throw new Error('Error al guardar el registro');
      }

    } catch (error) {
      console.error('Error:', error);
      setSuccessMessage(error.message || 'Error al enviar los datos');
      setModalType('error');
      // Do not close modal on error so user can fix
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2500);
    } finally {
      setLoading(false);
    }
  };

  const getAddButtonText = () => {
    switch (location.pathname) {
      case '/ventas': return 'Agregar Venta';
      case '/clientes': return 'Agregar Cliente';
      case '/empleados': return 'Agregar Empleado';
      case '/compras': return 'Agregar Compra';
      case '/inventario': return 'Agregar Producto';
      default: return null;
    }
  };

  const getEditButtonText = () => {
    switch (location.pathname) {
      case '/ventas': return 'Editar Venta';
      case '/clientes': return 'Editar Cliente';
      case '/empleados': return 'Editar Empleado';
      case '/compras': return 'Editar Compra';
      case '/inventario': return 'Editar Producto';
      default: return null;
    }
  };


  const addButtonText = getAddButtonText();
  const editButtonText = getEditButtonText();

  return (
    <Box>
      {isMobile && (
        <div
          className={`menu-backdrop ${isOpen ? 'visible' : ''}`}
          onClick={toggleMenu}
        />
      )}
      {isMobile ? (
        <Box className="floating-menu-container">
          <Fab
            color="primary"
            aria-label="menu"
            onClick={toggleMenu}
            className={`floating-button ${isOpen ? 'rotated' : ''}`}
          >
            <AddIcon className='btn-icono' />
          </Fab>
          <Box className={`submenu ${isOpen ? 'open' : ''}`}>
            {selectedItem && editButtonText && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => {
                  handleEdit();
                  toggleMenu();
                }}
                className="submenu-button"
              >
                {editButtonText}
              </Button>
            )}
            {addButtonText && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  handleAdd();
                  toggleMenu();
                }}
                className="submenu-button"
              >
                {addButtonText}
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={() => {
                handleSettings();
                toggleMenu();
              }}
              className="submenu-button"
            >
              Ajustes
            </Button>
            <Button
              variant="contained"
              startIcon={<LogoutIcon />}
              onClick={() => {
                handleLogout();
                toggleMenu();
              }}
              className="submenu-button"
            >
              Cerrar Sesión
            </Button>
          </Box>
        </Box>
      ) : (
        <Box className="desktop-menu-container">
          <Collapse in={!!addButtonText} orientation="horizontal" timeout={300} unmountOnExit>
            <Box sx={{ whiteSpace: 'nowrap' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                className="desktop-button"
              >
                {addButtonText}
              </Button>
            </Box>
          </Collapse>

          <Collapse in={!!(selectedItem && editButtonText)} orientation="horizontal" timeout={300} unmountOnExit>
            <Box sx={{ whiteSpace: 'nowrap' }}>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                className="desktop-button"
              >
                {editButtonText}
              </Button>
            </Box>
          </Collapse>

          <Tooltip title="Ajustes">
            <Button
              variant="contained"
              onClick={handleSettings}
              className="desktop-button-icon"
              sx={{}}
            >
              <SettingsIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Cerrar Sesión">
            <Button
              variant="contained"
              onClick={handleLogout}
              className="desktop-button-icon"
              color="error"
            >
              <LogoutIcon />
            </Button>
          </Tooltip>
        </Box>
      )}

      {/* ADD MODAL */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: 'custom-modal-paper' }}
        TransitionComponent={Transition}
        transitionDuration={350}
        slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
      >
        <DialogTitle className="modal-title">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="inherit">Agregar {addButtonText?.replace('Agregar ', '')}</Typography>
            <div id="modal-header-actions"></div>
          </Box>
        </DialogTitle>
        <DialogContent className="modal-content-styled">
          <DialogContentText sx={{ mb: 2 }}>
            Ingresa los detalles para agregar un nuevo registro.
          </DialogContentText>
          <ModalFormManager
            key={modalOpen ? 'add-active' : 'add-inactive'}
            ref={formRef}
            catalogs={catalogs}
            onSubmit={handleFormSubmit}
            isEdit={false}
          />
        </DialogContent>
        {loading && <LoadingOverlay message="Guardando..." />}
        <DialogActions className="modal-actions-styled">
          <Button onClick={handleCloseModal} disabled={loading} className="modal-btn-secondary">Cancelar</Button>
          <Button onClick={() => formRef.current?.submit()} variant="contained" disabled={loading} className="modal-btn-primary">Agregar</Button>
        </DialogActions>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: 'custom-modal-paper' }}
        TransitionComponent={Transition}
        transitionDuration={350}
        slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
      >
        <DialogTitle className="modal-title">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="inherit">Editar {editButtonText?.replace('Editar ', '')}</Typography>
            <div id="modal-header-actions-edit"></div>
          </Box>
        </DialogTitle>
        <DialogContent className="modal-content-styled">
          <DialogContentText sx={{ mb: 2 }}>
            Modifica los detalles del registro.
          </DialogContentText>
          <ModalFormManager
            key={selectedItem?.id || 'edit-inactive'}
            ref={editFormRef}
            catalogs={catalogs}
            initialData={selectedItem}
            onSubmit={handleFormSubmit}
            isEdit={true}
          />
        </DialogContent>
        {loading && <LoadingOverlay message="Actualizando..." />}
        <DialogActions className="modal-actions-styled">
          <Button onClick={handleCloseEditModal} disabled={loading} className="modal-btn-secondary">Cancelar</Button>
          <Button onClick={() => editFormRef.current?.submit()} variant="contained" disabled={loading} className="modal-btn-primary">Actualizar</Button>
        </DialogActions>
      </Dialog>

      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
        type={modalType}
      />
    </Box >
  );
};

export default FloatingMenu;
