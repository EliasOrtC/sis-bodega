import React, { useRef } from 'react';
import { Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelection } from '../CSS/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';

const Purchases = () => {
  const { selectedItem, setSelectedItem } = useSelection();
  const tableRef = useRef(null);

  const {
    data: purchases,
    loading,
    error,
    tableClass,
    maxHeightValue,
    timeTransition
  } = useTableData('compras', 'purchasesUpdated', selectedItem, setSelectedItem);

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid item xs={12}>
        <Card sx={{ width: '100%' }} className='tarjeta'>
          <CardContent className='tarjeta-contenido'>
            <Typography variant="h4">Compras</Typography>
            <Typography>Módulo de Compras</Typography>
            <TableContainer ref={tableRef} component={Paper} className={`${tableClass} div-contenedor-tabla `} sx={{ mt: 2, height: 'auto', maxHeight: maxHeightValue, transition: `max-height ${timeTransition}s ease`, overflowY: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha Compra</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Total Compra</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(purchases) && purchases.map((purchase, index) => (
                    <TableRow
                      key={purchase.id}
                      style={{
                        opacity: 0,
                        animation: `fadeIn 0.2s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.2}s`,
                      }}
                      onClick={() => {
                        setSelectedItem(selectedItem?.id === purchase.id ? null : purchase);
                      }}
                      selected={selectedItem?.id === purchase.id}
                    >
                      <TableCell>{purchase.fechaDeCompra}</TableCell>
                      <TableCell>{purchase.proveedor.nombreProveedor}</TableCell>
                      <TableCell>{purchase.totalCompra}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {loading ? <Typography variant="body2" color="green" backgroundColor="#ffffffcf" fontSize='1.2rem'>Cargando compras...</Typography> : null}
              {error ? <Typography variant="body2" color="error" backgroundColor="#ffffffcf" fontSize='1.2rem'>Error al obtener las compras {error}</Typography> : null}
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Purchases;