import React, { useRef } from 'react';
import { Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelection } from '../CSS/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';

const Inventario = () => {
  const { selectedItem, setSelectedItem } = useSelection();
  const tableRef = useRef(null);

  const {
    data: inventory,
    loading,
    error,
    tableClass,
    maxHeightValue,
    timeTransition
  } = useTableData('inventario', 'inventoryUpdated', selectedItem, setSelectedItem);

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid item xs={12}>
        <Card sx={{ width: '100%' }} className='tarjeta'>
          <CardContent className='tarjeta-contenido'>
            <Typography variant="h4">Inventario</Typography>
            <Typography>Módulo de Inventario</Typography>
            <TableContainer ref={tableRef} component={Paper} className={`${tableClass} div-contenedor-tabla `} sx={{ mt: 2, height: 'auto', maxHeight: maxHeightValue, transition: `max-height ${timeTransition}s ease`, overflowY: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Tipo Paquete</TableCell>
                    <TableCell>Inventario</TableCell>
                    <TableCell>Cantidad Unidades</TableCell>
                    <TableCell>Cantidad Paquetes</TableCell>
                    <TableCell>Precio Venta</TableCell>
                    <TableCell>Precio Compra</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(inventory) && inventory.map((item, index) => (
                    <TableRow
                      key={item.id}
                      style={{
                        opacity: 0,
                        animation: `fadeIn 0.2s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.2}s`,
                      }}
                      onClick={() => {
                        setSelectedItem(selectedItem?.id === item.id ? null : item);
                      }}
                      selected={selectedItem?.id === item.id}
                    >
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>{item.tipoPaquete}</TableCell>
                      <TableCell>{item.inventario}</TableCell>
                      <TableCell>{item.cantidadUnidades}</TableCell>
                      <TableCell>{item.cantidadPaquetes}</TableCell>
                      <TableCell>{item.precioVenta_Paq}</TableCell>
                      <TableCell>{item.precioCompra_Paq}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {loading ? <Typography variant="body2" color="green" backgroundColor="#ffffffcf" fontSize='1.2rem'>Cargando inventario...</Typography> : null}
              {error ? <Typography variant="body2" color="error" backgroundColor="#ffffffcf" fontSize='1.2rem'>Error al obtener el inventario {error}</Typography> : null}
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Inventario;