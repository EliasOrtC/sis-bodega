import React, { useRef } from 'react';
import { Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelection } from '../CSS/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';

const Clients = () => {
  const { selectedItem, setSelectedItem } = useSelection();
  const tableRef = useRef(null);

  const {
    data: clients,
    loading,
    error,
    tableClass,
    maxHeightValue,
    timeTransition
  } = useTableData('clientes', 'clientsUpdated', selectedItem, setSelectedItem);

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid item xs={12}>
        <Card sx={{ width: '100%' }} className='tarjeta'>
          <CardContent className='tarjeta-contenido'>
            <Typography variant="h4">Clientes</Typography>
            <Typography>Módulo de Clientes</Typography>
            <TableContainer ref={tableRef} component={Paper} className={`${tableClass} div-contenedor-tabla `} sx={{ mt: 2, height: 'auto', maxHeight: maxHeightValue, transition: `max-height ${timeTransition}s ease`, overflowY: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombres y Apellidos</TableCell>
                    <TableCell>Correo</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>No. Cédula</TableCell>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Fecha De Registro</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(clients) && clients.map((client, index) => (
                    <TableRow
                      key={client.id}
                      style={{
                        opacity: 0,
                        animation: `fadeIn 0.2s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.2}s`,
                      }}
                      onClick={() => {
                        setSelectedItem(selectedItem?.id === client.id ? null : client);
                      }}
                      selected={selectedItem?.id === client.id}
                    >
                      <TableCell>{client.nombres + ' ' + client.apellidos}</TableCell>
                      <TableCell>{client.correo}</TableCell>
                      <TableCell>{client.telefono}</TableCell>
                      <TableCell>{client.numCedula}</TableCell>
                      <TableCell>{client.direccion}</TableCell>
                      <TableCell>{client.fechaRegistro}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {loading ? <Typography variant="body2" color="green" backgroundColor="#ffffffcf" fontSize='1.2rem'>Cargando clientes...</Typography> : null}
              {error ? <Typography variant="body2" color="error" backgroundColor="#ffffffcf" fontSize='1.2rem'>Error al obtener los clientes {error}</Typography> : null}
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Clients;