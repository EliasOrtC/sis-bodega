import React, { useState, useMemo, useCallback, memo } from 'react';
import { Typography, Grid, Box, Pagination, Card, CardContent } from '@mui/material';
import { useSelection } from '../context/SelectionContext';
import useTableData from '../hooks/useTableData';
import TableStatus from '../components/common/TableStatus';
import ProductCard from '../components/common/ProductCard';

// Definición de animación fuera del componente para evitar recreación de estilos CSS (Memory Leak prevention)
// Emotion/MUI genera una clase CSS única para sx. Al definir las keyframes aquí una sola vez,
// evitamos que se dupliquen en el DOM head en cada renderizado.
const fadeInKeyframes = {
  '@keyframes fadeIn': {
    '0%': { opacity: 0, transform: 'translateY(10px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
};

const Inventario = () => {
  const { selectedItem, setSelectedItem } = useSelection();

  const {
    data: inventory,
    loading,
    error
  } = useTableData('inventario', 'inventoryUpdated', selectedItem, setSelectedItem);

  // Estados de paginación
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Memoizar el cambio de página para evitar re-renders innecesarios
  const handlePageChange = useCallback((event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Memoizar los datos paginados para evitar re-cálculos costosos y nuevas referencias de array en cada render
  const paginatedInventory = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    return inventory.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }, [inventory, page]);

  // Memoizar el contador de páginas
  const count = useMemo(() =>
    Array.isArray(inventory) ? Math.ceil(inventory.length / ITEMS_PER_PAGE) : 0
    , [inventory]);

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid item xs={12}>
        <Card sx={{ width: '100%', background: 'transparent', boxShadow: 'none' }} className='tarjeta'>
          <CardContent className='tarjeta-contenido'>
            <Box mb={3}>
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#ffffffff' }}>Inventario</Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.8, color: '#ffffffff' }}>Gestión de productos</Typography>
            </Box>

            <TableStatus
              loading={loading}
              error={error}
              loadingMessage="Cargando Inventario..."
              errorMessage={`Error al obtener el Inventario: ${error}`}
            />

            {!loading && !error && (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 3,
                    '@media (max-width: 940px)': {
                      gridTemplateColumns: 'repeat(3, 1fr)',
                    },
                    '@media (max-width: 780px)': {
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 2
                    },
                    '@media (max-width: 450px)': {
                      gridTemplateColumns: '1fr',
                      gap: 1.5
                    }
                  }}
                >
                  {paginatedInventory.map((item, index) => (
                    <Box key={item.id}
                      sx={{
                        opacity: 0,
                        animation: `fadeIn 0.3s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.05}s`,
                        ...fadeInKeyframes
                      }}
                    >
                      <ProductCard
                        product={item}
                        isSelected={selectedItem?.id === item.id}
                        onSelect={(product) => {
                          setSelectedItem(selectedItem?.id === product.id ? null : product);
                        }}
                      />
                    </Box>
                  ))}
                </Box>

                {/* Paginación */}
                {count > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination
                      count={count}
                      page={page}
                      onChange={handlePageChange}
                      color="primary"
                      size="large"
                      shape="rounded"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// React.memo evita que todo el grid se re-renderice si el componente padre cambia pero sus props no.
export default memo(Inventario);