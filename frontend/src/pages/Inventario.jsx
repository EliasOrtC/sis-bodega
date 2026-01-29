import React, { useRef, useState } from 'react';
import { Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Pagination, Box } from '@mui/material';
import { useSelection } from '../context/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';
import TableStatus from '../components/common/TableStatus.jsx';

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

  // Estados de paginación
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const handlePageChange = (event, value) => {
    setPage(value);
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
  };

  const paginatedInventory = Array.isArray(inventory)
    ? inventory.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
    : [];

  const count = Array.isArray(inventory) ? Math.ceil(inventory.length / ITEMS_PER_PAGE) : 0;

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid size={12}>
        <Card sx={{ width: '100%' }} className='tarjeta'>
          <CardContent className='tarjeta-contenido'>
            <Typography variant="h4">Inventario</Typography>
            <Typography>Módulo de Inventario</Typography>
            <TableContainer ref={tableRef} component={Paper} className={`${tableClass} div-contenedor-tabla `} sx={{ mt: 2, height: 'auto', maxHeight: maxHeightValue, overflowY: 'auto' }}>
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
                  {paginatedInventory.map((item, index) => (
                    <TableRow
                      key={item.id}
                      style={{
                        opacity: 0,
                        animation: `fadeIn 0.2s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.05}s`,
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
            </TableContainer>

            {/* Paginación */}
            {count > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={count}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
            <TableStatus
              loading={loading}
              error={error}
              loadingMessage="Cargando Inventario..."
              errorMessage={`Error al obtener el Inventario: ${error}`}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Inventario;