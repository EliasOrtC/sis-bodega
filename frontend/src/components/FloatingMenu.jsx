import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Fab, Button, Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Autocomplete, Zoom, useTheme, useMediaQuery, Tooltip, Collapse } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useSelection } from '../CSS/SelectionContext.jsx';
import '../CSS/FloatingMenu.css';
import SuccessModal from '../CSS/SuccessModal.jsx';
import LoadingOverlay from '../CSS/LoadingOverlay.jsx';
import '../CSS/Modales.css';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Zoom ref={ref} {...props} />;
});

const FloatingMenu = ({ onLogout }) => {
  const location = useLocation();
  const { selectedItem, setSelectedItem } = useSelection();
  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editFormData, setEditFormData] = useState({});
  const [empleados, setEmpleados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [supervisores, setSupervisores] = useState([]);

  const [proveedores, setProveedores] = useState([]);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [editSelectedEmpleado, setEditSelectedEmpleado] = useState(null);
  const [editSelectedCliente, setEditSelectedCliente] = useState(null);
  const [editSelectedSupervisor, setEditSelectedSupervisor] = useState(null);
  const [editSelectedProveedor, setEditSelectedProveedor] = useState(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchEmpleados = async () => {
      try {
        const response = await fetch('http://192.168.1.235:5001/empleados');
        if (response.ok) {
          const data = await response.json();
          setEmpleados(data);
        }
      } catch (error) {
        console.error('Error al obtener empleados:', error);
      }
    };

    const fetchClientes = async () => {
      try {
        const response = await fetch('http://192.168.1.235:5001/clientes');
        if (response.ok) {
          const data = await response.json();
          setClientes(data);
        }
      } catch (error) {
        console.error('Error al obtener clientes:', error);
      }
    };

    const fetchSupervisores = async () => {
      try {
        const response = await fetch('http://192.168.1.235:5001/empleados');
        if (response.ok) {
          const data = await response.json();
          setSupervisores(data);
        }
      } catch (error) {
        console.error('Error al obtener supervisores:', error);
      }
    };



    const fetchProveedores = async () => {
      try {
        const response = await fetch('http://192.168.1.235:5001/proveedores');
        if (response.ok) {
          const data = await response.json();
          setProveedores(data);
        }
      } catch (error) {
        console.error('Error al obtener proveedores:', error);
      }
    };

    fetchSupervisores();
    fetchEmpleados();
    fetchClientes();

    fetchProveedores();
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    onLogout();
  };

  const handleSettings = () => {
    // Placeholder para ajustes
    alert('Funcionalidad de ajustes próximamente');
  };

  const handleAdd = () => {
    setModalOpen(true);
    setFormData({});
    setSelectedProveedor(null);
  };

  const handleEdit = () => {
    if (selectedItem) {
      // Para ventas, extraer los IDs de empleado y cliente
      if (location.pathname === '/ventas') {
        setEditFormData({
          ...selectedItem,
          id_empleado: selectedItem.empleado.id,
          id_cliente: selectedItem.cliente.id
        });
        // Encontrar y establecer los objetos de empleado y cliente seleccionados
        const empleadoSeleccionado = empleados.find(emp => emp.id === selectedItem.empleado.id);
        const clienteSeleccionado = clientes.find(cli => cli.id === selectedItem.cliente.id);
        setEditSelectedEmpleado(empleadoSeleccionado || null);
        setEditSelectedCliente(clienteSeleccionado || null);
      } else if (location.pathname === '/empleados') {
        setEditFormData({
          ...selectedItem,
          Supervisor: selectedItem.supervisor ? selectedItem.supervisor.id : null
        });
        // Encontrar y establecer el supervisor seleccionado
        const supervisorSeleccionado = supervisores.find(sup => sup.id === (selectedItem.supervisor ? selectedItem.supervisor.id : null));
        setEditSelectedSupervisor(supervisorSeleccionado || null);
      } else if (location.pathname === '/compras') {
        setEditFormData({
          ...selectedItem,
          id_proveedor: selectedItem.id_proveedor
        });
        // Encontrar y establecer el proveedor seleccionado
        const proveedorSeleccionado = proveedores.find(prov => prov.id === selectedItem.id_proveedor);
        setEditSelectedProveedor(proveedorSeleccionado || null);
      } else {
        setEditFormData({ ...selectedItem });
      }
      setEditModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular carga para ver spinner
    const path = location.pathname;
    let endpoint = '';
    let data = {};

    switch (path) {
      case '/ventas':
        endpoint = 'http://192.168.1.235:5001/ventas';
        data = {
          id_empleado: selectedEmpleado ? selectedEmpleado.id : null,
          id_cliente: selectedCliente ? selectedCliente.id : null,
          fechaRegistro: formData.fechaRegistro,
          totalVenta: parseFloat(formData.totalVenta)
        };
        break;
      case '/clientes':
        endpoint = 'http://192.168.1.235:5001/clientes';
        data = {
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          correo: formData.correo,
          telefono: formData.telefono,
          fechaRegistro: formData.fechaRegistro,
          numCedula: formData.numCedula,
          direccion: formData.direccion
        };
        break;
      case '/empleados':
        endpoint = 'http://192.168.1.235:5001/empleados';
        data = {
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          estadoCivil: formData.estadoCivil,
          sexo: formData.sexo,
          fechaDeNacimiento: formData.fechaDeNacimiento,
          fechaDeInicioContrato: formData.fechaDeInicioContrato,
          fechaDeFinContrato: formData.fechaDeFinContrato,
          ruc: formData.ruc,
          numCedula: formData.numCedula,
          numInss: formData.numInss,
          estado: formData.estado,
          sector: formData.sector,
          supervisor: formData.supervisor ? parseInt(formData.supervisor) : null,
          salarioBase: parseFloat(formData.salarioBase)
        };
        break;
      case '/compras':
        endpoint = 'http://192.168.1.235:5001/compras';
        data = {
          fechaDeCompra: formData.fechaDeCompra,
          id_proveedor: selectedProveedor ? selectedProveedor.id : null,
          totalCompra: parseFloat(formData.totalCompra)
        };
        break;
      case '/inventario':
        endpoint = 'http://192.168.1.235:5001/inventario';
        data = {
          nombre: formData.nombre,
          tipoPaquete: parseInt(formData.tipoPaquete),
          inventario: parseFloat(formData.inventario),
          cantidadUnidades: parseInt(formData.cantidadUnidades),
          cantidadPaquetes: parseInt(formData.cantidadPaquetes),
          precioVenta_Paq: parseFloat(formData.precioVenta_Paq),
          precioCompra_Paq: parseFloat(formData.precioCompra_Paq)
        };
        break;
      default:
        return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        console.log('Registro agregado correctamente');
        setModalOpen(false);
        setSuccessMessage('Registro agregado correctamente');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 500);
      } else {
        alert('Error al agregar el registro');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular carga para ver spinner
    const path = location.pathname;
    let endpoint = '';

    switch (path) {
      case '/ventas':
        endpoint = `http://192.168.1.235:5001/ventas/${selectedItem.id}`;
        break;
      case '/clientes':
        endpoint = `http://192.168.1.235:5001/clientes/${selectedItem.id}`;
        break;
      case '/empleados':
        endpoint = `http://192.168.1.235:5001/empleados/${selectedItem.id}`;
        break;
      case '/compras':
        endpoint = `http://192.168.1.235:5001/compras/${selectedItem.id}`;
        break;
      case '/inventario':
        endpoint = `http://192.168.1.235:5001/inventario/${selectedItem.id}`;
        break;
      default:
        return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });
      if (response.ok) {
        console.log('Registro actualizado correctamente');
        setEditModalOpen(false);
        setSelectedItem(null); // Limpiar selección después de editar
        setSuccessMessage('Registro actualizado correctamente');
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 1500);
      } else {
        alert('Error al actualizar el registro');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar los datos');
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

  const renderModalContent = () => {
    const path = location.pathname;
    switch (path) {
      case '/ventas':
        return (
          <>
            <Autocomplete
              fullWidth
              options={empleados}
              getOptionLabel={(option) => `${option.nombres} ${option.apellidos}`}
              value={selectedEmpleado}
              onChange={(event, newValue) => {
                setSelectedEmpleado(newValue);
                setFormData({ ...formData, id_empleado: newValue ? newValue.id : '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Empleado"
                  margin="normal"
                  fullWidth
                  className="modern-input"
                />
              )}
            />
            <Autocomplete
              options={clientes}
              getOptionLabel={(option) => `${option.nombres} ${option.apellidos}`}
              value={selectedCliente}
              onChange={(event, newValue) => {
                setSelectedCliente(newValue);
                setFormData({ ...formData, id_cliente: newValue ? newValue.id : '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  margin="normal"
                  fullWidth
                  className="modern-input"
                />
              )}
            />
            <TextField label="Fecha Registro" type="date" fullWidth margin="normal" value={formData.fechaRegistro || ''} onChange={(e) => setFormData({ ...formData, fechaRegistro: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="Total Venta" type="number" fullWidth margin="normal" value={formData.totalVenta || ''} onChange={(e) => setFormData({ ...formData, totalVenta: e.target.value })} className="modern-input" />
          </>
        );
      case '/clientes':
        return (
          <>
            <TextField label="Nombres" fullWidth margin="normal" value={formData.nombres || ''} onChange={(e) => setFormData({ ...formData, nombres: e.target.value })} className="modern-input" />
            <TextField label="Apellidos" fullWidth margin="normal" value={formData.apellidos || ''} onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })} className="modern-input" />
            <TextField label="Correo" type="email" fullWidth margin="normal" value={formData.correo || ''} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="modern-input" />
            <TextField label="Teléfono" fullWidth margin="normal" value={formData.telefono || ''} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="modern-input" />
            <TextField label="Fecha Registro" type="date" fullWidth margin="normal" value={formData.fechaRegistro || ''} onChange={(e) => setFormData({ ...formData, fechaRegistro: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="Número Cédula" fullWidth margin="normal" value={formData.numCedula || ''} onChange={(e) => setFormData({ ...formData, numCedula: e.target.value })} className="modern-input" />
            <TextField label="Dirección" fullWidth margin="normal" value={formData.direccion || ''} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="modern-input" />
          </>
        );
      case '/empleados':
        return (
          <>
            <TextField label="Nombres" fullWidth margin="normal" value={formData.nombres || ''} onChange={(e) => setFormData({ ...formData, nombres: e.target.value })} className="modern-input" />
            <TextField label="Apellidos" fullWidth margin="normal" value={formData.apellidos || ''} onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })} className="modern-input" />
            <TextField label="Estado Civil" fullWidth margin="normal" value={formData.estadoCivil || ''} onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })} className="modern-input" />
            <TextField label="Sexo" fullWidth margin="normal" value={formData.sexo || ''} onChange={(e) => setFormData({ ...formData, sexo: e.target.value })} className="modern-input" />
            <TextField label="Fecha de Nacimiento" type="date" fullWidth margin="normal" value={formData.fechaDeNacimiento || ''} onChange={(e) => setFormData({ ...formData, fechaDeNacimiento: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="Fecha de Inicio Contrato" type="date" fullWidth margin="normal" value={formData.fechaDeInicioContrato || ''} onChange={(e) => setFormData({ ...formData, fechaDeInicioContrato: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="Fecha de Fin Contrato" type="date" fullWidth margin="normal" value={formData.fechaDeFinContrato || ''} onChange={(e) => setFormData({ ...formData, fechaDeFinContrato: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="RUC" fullWidth margin="normal" value={formData.ruc || ''} onChange={(e) => setFormData({ ...formData, ruc: e.target.value })} className="modern-input" />
            <TextField label="Número Cédula" fullWidth margin="normal" value={formData.numCedula || ''} onChange={(e) => setFormData({ ...formData, numCedula: e.target.value })} className="modern-input" />
            <TextField label="Número INSS" fullWidth margin="normal" value={formData.numInss || ''} onChange={(e) => setFormData({ ...formData, numInss: e.target.value })} className="modern-input" />
            <TextField label="Estado" fullWidth margin="normal" value={formData.estado || ''} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="modern-input" />
            <TextField label="Sector" fullWidth margin="normal" value={formData.sector || ''} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} className="modern-input" />
            <TextField label="Supervisor" type="number" fullWidth margin="normal" value={formData.supervisor || ''} onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })} className="modern-input" />
            <TextField label="Salario Base" type="number" fullWidth margin="normal" value={formData.salarioBase || ''} onChange={(e) => setFormData({ ...formData, salarioBase: e.target.value })} className="modern-input" />
          </>
        );
      case '/compras':
        return (
          <>
            <TextField label="Fecha de Compra" type="date" fullWidth margin="normal" value={formData.fechaDeCompra || ''} onChange={(e) => setFormData({ ...formData, fechaDeCompra: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <Autocomplete
              fullWidth
              options={proveedores}
              getOptionLabel={(option) => option.nombreProveedor}
              value={selectedProveedor}
              onChange={(event, newValue) => {
                setSelectedProveedor(newValue);
                setFormData({ ...formData, id_proveedor: newValue ? newValue.id : '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor"
                  margin="normal"
                  fullWidth
                  className="modern-input"
                />
              )}
            />
            <TextField label="Total Compra" type="number" fullWidth margin="normal" value={formData.totalCompra || ''} onChange={(e) => setFormData({ ...formData, totalCompra: e.target.value })} className="modern-input" />
          </>
        );
      case '/inventario':
        return (
          <>
            <TextField label="Nombre" fullWidth margin="normal" value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="modern-input" />
            <TextField label="Tipo Paquete" type="number" fullWidth margin="normal" value={formData.tipoPaquete || ''} onChange={(e) => setFormData({ ...formData, tipoPaquete: e.target.value })} className="modern-input" />
            <TextField label="Inventario" type="number" fullWidth margin="normal" value={formData.inventario || ''} onChange={(e) => setFormData({ ...formData, inventario: e.target.value })} className="modern-input" />
            <TextField label="Cantidad Unidades" type="number" fullWidth margin="normal" value={formData.cantidadUnidades || ''} onChange={(e) => setFormData({ ...formData, cantidadUnidades: e.target.value })} className="modern-input" />
            <TextField label="Cantidad Paquetes" type="number" fullWidth margin="normal" value={formData.cantidadPaquetes || ''} onChange={(e) => setFormData({ ...formData, cantidadPaquetes: e.target.value })} className="modern-input" />
            <TextField label="Precio Venta Paquete" type="number" fullWidth margin="normal" value={formData.precioVenta_Paq || ''} onChange={(e) => setFormData({ ...formData, precioVenta_Paq: e.target.value })} className="modern-input" />
            <TextField label="Precio Compra Paquete" type="number" fullWidth margin="normal" value={formData.precioCompra_Paq || ''} onChange={(e) => setFormData({ ...formData, precioCompra_Paq: e.target.value })} className="modern-input" />
          </>
        );
      default:
        return null;
    }
  };

  const renderEditModalContent = () => {
    const path = location.pathname;
    switch (path) {
      case '/ventas':
        return (
          <>
            <Autocomplete
              fullWidth
              options={empleados}
              getOptionLabel={(option) => `${option.nombres} ${option.apellidos}`}
              value={editSelectedEmpleado}
              onChange={(event, newValue) => {
                setEditSelectedEmpleado(newValue);
                setEditFormData({ ...editFormData, id_empleado: newValue ? newValue.id : '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Empleado"
                  margin="normal"
                  fullWidth
                  className="modern-input"
                />
              )}
            />
            <Autocomplete
              options={clientes}
              getOptionLabel={(option) => `${option.nombres} ${option.apellidos}`}
              value={editSelectedCliente}
              onChange={(event, newValue) => {
                setEditSelectedCliente(newValue);
                setEditFormData({ ...editFormData, id_cliente: newValue ? newValue.id : '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  margin="normal"
                  fullWidth
                  className="modern-input"
                />
              )}
            />
            <TextField label="Fecha Registro" type="date" fullWidth margin="normal" value={editFormData.fechaRegistro || ''} onChange={(e) => setEditFormData({ ...editFormData, fechaRegistro: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="Total Venta" type="number" fullWidth margin="normal" value={editFormData.totalVenta || ''} onChange={(e) => setEditFormData({ ...editFormData, totalVenta: e.target.value })} className="modern-input" />
          </>
        );
      case '/clientes':
        return (
          <>
            <TextField label="Nombres" fullWidth margin="normal" value={editFormData.nombres || ''} onChange={(e) => setEditFormData({ ...editFormData, nombres: e.target.value })} className="modern-input" />
            <TextField label="Apellidos" fullWidth margin="normal" value={editFormData.apellidos || ''} onChange={(e) => setEditFormData({ ...editFormData, apellidos: e.target.value })} className="modern-input" />
            <TextField label="Correo" type="email" fullWidth margin="normal" value={editFormData.correo || ''} onChange={(e) => setEditFormData({ ...editFormData, correo: e.target.value })} className="modern-input" />
            <TextField label="Teléfono" fullWidth margin="normal" value={editFormData.telefono || ''} onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })} className="modern-input" />
            <TextField label="Fecha Registro" type="date" fullWidth margin="normal" value={editFormData.fechaRegistro || ''} onChange={(e) => setEditFormData({ ...editFormData, fechaRegistro: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="Número Cédula" fullWidth margin="normal" value={editFormData.numCedula || ''} onChange={(e) => setEditFormData({ ...editFormData, numCedula: e.target.value })} className="modern-input" />
            <TextField label="Dirección" fullWidth margin="normal" value={editFormData.direccion || ''} onChange={(e) => setEditFormData({ ...editFormData, direccion: e.target.value })} className="modern-input" />
          </>
        );
      case '/empleados':
        return (
          <>
            <TextField label="Nombres" fullWidth margin="normal" value={editFormData.nombres || ''} onChange={(e) => setEditFormData({ ...editFormData, nombres: e.target.value })} className="modern-input" />
            <TextField label="Apellidos" fullWidth margin="normal" value={editFormData.apellidos || ''} onChange={(e) => setEditFormData({ ...editFormData, apellidos: e.target.value })} className="modern-input" />
            <TextField label="Estado Civil" fullWidth margin="normal" value={editFormData.estadoCivil || ''} onChange={(e) => setEditFormData({ ...editFormData, estadoCivil: e.target.value })} className="modern-input" />
            <TextField label="Sexo" fullWidth margin="normal" value={editFormData.sexo || ''} onChange={(e) => setEditFormData({ ...editFormData, sexo: e.target.value })} className="modern-input" />
            <TextField label="Fecha de Nacimiento" type="date" fullWidth margin="normal" value={editFormData.fechaDeNacimiento || ''} onChange={(e) => setEditFormData({ ...editFormData, fechaDeNacimiento: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="Fecha de Inicio Contrato" type="date" fullWidth margin="normal" value={editFormData.fechaDeInicioContrato || ''} onChange={(e) => setEditFormData({ ...editFormData, fechaDeInicioContrato: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="Fecha de Fin Contrato" type="date" fullWidth margin="normal" value={editFormData.fechaDeFinContrato || ''} onChange={(e) => setEditFormData({ ...editFormData, fechaDeFinContrato: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />
            <TextField label="RUC" fullWidth margin="normal" value={editFormData.ruc || ''} onChange={(e) => setEditFormData({ ...editFormData, ruc: e.target.value })} className="modern-input" />
            <TextField label="Número Cédula" fullWidth margin="normal" value={editFormData.numCedula || ''} onChange={(e) => setEditFormData({ ...editFormData, numCedula: e.target.value })} className="modern-input" />
            <TextField label="Número INSS" fullWidth margin="normal" value={editFormData.numInss || ''} onChange={(e) => setEditFormData({ ...editFormData, numInss: e.target.value })} className="modern-input" />
            <TextField label="Estado" fullWidth margin="normal" value={editFormData.estado || ''} onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value })} className="modern-input" />
            <TextField label="Sector" fullWidth margin="normal" value={editFormData.sector || ''} onChange={(e) => setEditFormData({ ...editFormData, sector: e.target.value })} className="modern-input" />

            <Autocomplete
              fullWidth
              options={supervisores}
              getOptionLabel={(option) => `${option.nombres} ${option.apellidos}`}
              value={editSelectedSupervisor}
              onChange={(event, newValue) => {
                setEditSelectedSupervisor(newValue);
                setEditFormData({ ...editFormData, Supervisor: newValue ? newValue.id : null });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Supervisor"
                  margin="normal"
                  fullWidth
                  className="modern-input"
                />
              )}
            />

            <TextField label="Salario Base" type="number" fullWidth margin="normal" value={editFormData.salarioBase || ''} onChange={(e) => setEditFormData({ ...editFormData, salarioBase: e.target.value })} className="modern-input" />
          </>
        );
      case '/compras':
        return (
          <>
            <TextField label="Fecha de Compra" type="date" fullWidth margin="normal" value={editFormData.fechaDeCompra || ''} onChange={(e) => setEditFormData({ ...editFormData, fechaDeCompra: e.target.value })} InputLabelProps={{ shrink: true }} className="modern-input" />

            <Autocomplete
              fullWidth
              options={proveedores}
              getOptionLabel={(option) => option.nombreProveedor}
              value={editSelectedProveedor}
              onChange={(event, newValue) => {
                setEditSelectedProveedor(newValue);
                setEditFormData({ ...editFormData, id_proveedor: newValue ? newValue.id : '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor"
                  margin="normal"
                  fullWidth
                  className="modern-input"
                />
              )}
            />

            <TextField label="Total Compra" type="number" fullWidth margin="normal" value={editFormData.totalCompra || ''} onChange={(e) => setEditFormData({ ...editFormData, totalCompra: e.target.value })} className="modern-input" />
          </>
        );
      case '/inventario':
        return (
          <>
            <TextField label="Nombre" fullWidth margin="normal" value={editFormData.nombre || ''} onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })} className="modern-input" />
            <TextField label="Tipo Paquete" type="number" fullWidth margin="normal" value={editFormData.tipoPaquete || ''} onChange={(e) => setEditFormData({ ...editFormData, tipoPaquete: e.target.value })} className="modern-input" />
            <TextField label="Inventario" type="number" fullWidth margin="normal" value={editFormData.inventario || ''} onChange={(e) => setEditFormData({ ...editFormData, inventario: e.target.value })} className="modern-input" />
            <TextField label="Cantidad Unidades" type="number" fullWidth margin="normal" value={editFormData.cantidadUnidades || ''} onChange={(e) => setEditFormData({ ...editFormData, cantidadUnidades: e.target.value })} className="modern-input" />
            <TextField label="Cantidad Paquetes" type="number" fullWidth margin="normal" value={editFormData.cantidadPaquetes || ''} onChange={(e) => setEditFormData({ ...editFormData, cantidadPaquetes: e.target.value })} className="modern-input" />
            <TextField label="Precio Venta Paquete" type="number" fullWidth margin="normal" value={editFormData.precioVenta_Paq || ''} onChange={(e) => setEditFormData({ ...editFormData, precioVenta_Paq: e.target.value })} className="modern-input" />
            <TextField label="Precio Compra Paquete" type="number" fullWidth margin="normal" value={editFormData.precioCompra_Paq || ''} onChange={(e) => setFormData({ ...formData, precioCompra_Paq: e.target.value })} className="modern-input" />
          </>
        );
      default:
        return null;
    }
  };

  const addButtonText = getAddButtonText();
  const editButtonText = getEditButtonText();

  return (
    <Box>
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
            <Button
              variant="contained"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              className="submenu-button"
              sx={{
                textTransform: 'none',
              }}
            >
              Cerrar Sesión
            </Button>
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={handleSettings}
              className="submenu-button"
              sx={{
                textTransform: 'none',
              }}
            >
              Ajustes
            </Button>
            {addButtonText && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                className="submenu-button"
                sx={{
                  textTransform: 'none',
                }}
              >
                {addButtonText}
              </Button>
            )}
            {selectedItem && editButtonText && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                className="submenu-button"
                sx={{
                  textTransform: 'none',
                }}
              >
                {editButtonText}
              </Button>
            )}

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
              color="error" // Opcional: Para distinguir el logout
            >
              <LogoutIcon />
            </Button>
          </Tooltip>
        </Box>
      )}

      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: 'custom-modal-paper' }}
        TransitionComponent={Transition}
        transitionDuration={500}
        slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
      >
        <DialogTitle className="modal-title">Agregar {addButtonText?.replace('Agregar ', '')}</DialogTitle>
        <DialogContent className="modal-content-styled">
          <DialogContentText sx={{ mb: 2 }}>
            Ingresa los detalles para agregar un nuevo registro.
          </DialogContentText>
          {renderModalContent()}
        </DialogContent>
        {loading && <LoadingOverlay message="Guardando..." />}
        <DialogActions className="modal-actions-styled">
          <Button onClick={handleCloseModal} disabled={loading} className="modal-btn-secondary">Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading} className="modal-btn-primary">Agregar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: 'custom-modal-paper' }}
        TransitionComponent={Transition}
        transitionDuration={500}
        slotProps={{ backdrop: { className: 'custom-modal-backdrop' } }}
      >
        <DialogTitle className="modal-title">Editar {editButtonText?.replace('Editar ', '')}</DialogTitle>
        <DialogContent className="modal-content-styled">
          <DialogContentText sx={{ mb: 2 }}>
            Modifica los detalles del registro.
          </DialogContentText>
          {renderEditModalContent()}
        </DialogContent>
        {loading && <LoadingOverlay message="Actualizando..." />}
        <DialogActions className="modal-actions-styled">
          <Button onClick={handleCloseEditModal} disabled={loading} className="modal-btn-secondary">Cancelar</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={loading} className="modal-btn-primary">Actualizar</Button>
        </DialogActions>
      </Dialog>

      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </Box>
  );
};

export default FloatingMenu;