import React, { useRef } from 'react';
import { Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelection } from '../context/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';
import TableStatus from '../components/common/TableStatus.jsx';

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
            <TableContainer ref={tableRef} component={Paper} className={`${tableClass} div-contenedor-tabla `} sx={{ mt: 2, height: 'auto', maxHeight: maxHeightValue, overflowY: 'auto' }}>
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
                        animation: `fadeIn 0.2s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.05}s`,
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
            </TableContainer>
            <TableStatus
              loading={loading}
              error={error}
              loadingMessage="Cargando Compras..."
              errorMessage={`Error al obtener las Compras: ${error}`}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Purchases;