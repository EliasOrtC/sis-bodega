import React, { useRef } from 'react';
import { Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelection } from '../CSS/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';

const Sales = () => {
  const { selectedItem, setSelectedItem } = useSelection();
  const tableRef = useRef(null);

  const {
    data: sales,
    loading,
    error,
    tableClass,
    maxHeightValue,
    timeTransition
  } = useTableData('ventas', 'VentasActualizadas', selectedItem, setSelectedItem);





  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid xs={12}>
        <Card sx={{ width: '100%' }} className='tarjeta'>
          <CardContent className='tarjeta-contenido'>
            <Typography variant="h4">Ventas</Typography>
            <Typography>Módulo de Ventas</Typography>
            <TableContainer ref={tableRef} component={Paper} className={`${tableClass} div-contenedor-tabla `} sx={{ mt: 2, height: 'auto', maxHeight: maxHeightValue, transition: `max-height ${timeTransition}s ease`, overflowY: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Empleado</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(sales) && sales.map((sale, index) => (
                    <TableRow
                      key={sale.id}
                      style={{
                        opacity: 0,
                        animation: `fadeIn 0.2s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.2}s`,
                      }}
                      onClick={() => {
                        setSelectedItem(selectedItem?.id === sale.id ? null : sale);
                      }}
                      selected={selectedItem?.id === sale.id}
                    >
                      <TableCell>{sale.empleado.nombres + ' ' + sale.empleado.apellidos}</TableCell>
                      <TableCell>{sale.cliente.nombres + ' ' + sale.cliente.apellidos}</TableCell>
                      <TableCell>{sale.fechaRegistro}</TableCell>
                      <TableCell>{sale.totalVenta}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {loading ? <Typography variant="body2" color="green" backgroundColor="#ffffffcf" fontSize='1.2rem'>Cargando ventas...</Typography> : null}
              {error ? <Typography variant="body2" color="error" backgroundColor="#ffffffcf" fontSize='1.2rem'>Error al obtener las ventas {error}</Typography> : null}
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Sales;