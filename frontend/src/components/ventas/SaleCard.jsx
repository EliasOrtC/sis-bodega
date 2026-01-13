import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';

/**
 * SaleCard - Componente memorizado para representar una tarjeta de venta.
 * Se utiliza React.memo para evitar re-renderizados innecesarios, lo que mejora
 * significativamente el rendimiento de las animaciones de la lista.
 */
const SaleCard = React.memo(({ sale, index, isSelected, onSelect, onShowDetails }) => {
    // Optimizamos el formateo de fecha para que no sea costoso
    const formattedDate = React.useMemo(() => {
        try {
            const [year, month, day] = sale.fechaRegistro.split('T')[0].split(' ')[0].split('-');
            return `${day}/${month}/${year}`;
        } catch (e) {
            return 'N/A';
        }
    }, [sale.fechaRegistro]);

    const totalFormatted = React.useMemo(() => {
        return Number(sale.totalVenta).toLocaleString('es-NI', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }, [sale.totalVenta]);

    return (
        <Card
            className={`sale-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(sale)}
            sx={{
                // Usamos delay dinámico pero mantenemos la clase para control CSS
                animationDelay: `${index * 0.05}s`,
                // La opacidad inicial se maneja en CSS para evitar flashes
            }}
        >
            <CardContent sx={{ p: '24px !important' }}>
                <Box className="sale-card-header">
                    <Typography className="sale-date">
                        {formattedDate}
                    </Typography>
                    <Box
                        className="sale-icon-container"
                        sx={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'scale(1.1)' }
                        }}
                        onClick={(e) => onShowDetails(e, sale)}
                    >
                        <ReceiptLongIcon sx={{ color: 'white' }} />
                    </Box>
                </Box>

                <Box className="sale-info-row" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <PersonIcon sx={{ color: 'black', fontSize: '1.2rem' }} />
                    <Box>
                        <Typography className="sale-info-label">Cliente</Typography>
                        <Typography className="sale-info-value">
                            {sale.cliente.nombres} {sale.cliente.apellidos}
                        </Typography>
                    </Box>
                </Box>

                <Box className="sale-info-row" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <BadgeIcon sx={{ color: 'black', fontSize: '1.2rem' }} />
                    <Box>
                        <Typography className="sale-info-label">Atendido por</Typography>
                        <Typography className="sale-info-value" sx={{ fontSize: '0.9rem' }}>
                            {sale.empleado.nombres} {sale.empleado.apellidos}
                        </Typography>
                    </Box>
                </Box>

                <Box className="sale-total-section">
                    <Typography className="sale-total-label">Total Venta</Typography>
                    <Typography className="sale-total-amount">
                        C$ {totalFormatted}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
});

SaleCard.displayName = 'SaleCard';

export default SaleCard;
