import React, { memo, useState } from 'react';
import {
    Card,
    CardContent,
    CardMedia,
    Typography,
    Box,
    Chip,
    Stack,
    Divider,
    useTheme,
    Tooltip
} from '@mui/material';
import Inventory2TwoToneIcon from '@mui/icons-material/Inventory2';

const ProductCard = ({ product, isSelected, onSelect }) => {
    const theme = useTheme();
    const [imgError, setImgError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Si el producto no existe por alguna razón, retornamos null para prevenir errores de renderizado
    if (!product) return null;

    const cleanPath = product.imagen_url ? product.imagen_url.replace(/^\//, '') : '';
    const finalUrl = product.imagen_url && product.imagen_url.startsWith('http')
        ? product.imagen_url
        : `https://ik.imagekit.io/gpb4w57ui/${cleanPath}`;

    const handleImageError = () => {
        setImgError(true);
    };

    const labelStyle = {
        fontSize: '0.7rem',
        opacity: 0.6,
        display: 'block',
        fontWeight: 800,
        color: isSelected ? '#9d0000' : '#000000ff',
        marginBottom: '2px',
        transition: 'color 0.3s ease'
    };

    return (
        <Card
            onClick={() => onSelect(product)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            elevation={isSelected ? 4 : isHovered ? 8 : 1}
            sx={{
                borderRadius: '14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                border: isSelected
                    ? '2px solid #9d0000'
                    : '2px solid transparent',
                backgroundColor: theme.palette.background.paper,
                boxShadow: isSelected
                    ? '0 0 0 2px #9d0000, 0 20px 40px rgba(157, 0, 0, 0.15)'
                    : isHovered ? '0 15px 35px rgba(30, 41, 59, 0.1)' : '0 10px 20px rgba(0, 0, 0, 0.05)',
                transform: isSelected
                    ? 'scale(1.02) translateY(-5px)'
                    : isHovered
                        ? 'translateY(-5px)'
                        : 'translateY(0)',
                overflow: 'hidden',
                '&:hover': {
                    backgroundColor: '#ffffff',
                }
            }}
        >
            {/* Ambient Image Mask Effect */}
            {(product.imagen_url && !imgError) && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: '25%',
                        left: '50%',
                        width: '100%',
                        height: '70%',
                        transform: isSelected
                            ? 'translate(-50%, -50%) scale(5)'
                            : 'translate(-50%, -50%) scale(0.55)',
                        backgroundColor: '#ffe4e4ff',
                        WebkitMaskImage: `url(${finalUrl})`,
                        WebkitMaskSize: 'contain',
                        WebkitMaskPosition: 'center',
                        WebkitMaskRepeat: 'no-repeat',
                        maskImage: `url(${finalUrl})`,
                        maskSize: 'contain',
                        maskPosition: 'center',
                        maskRepeat: 'no-repeat',
                        transition: 'all 3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        zIndex: 0,
                        pointerEvents: 'none'
                    }}
                />
            )}
            {/* Image Section */}
            <Box
                sx={{
                    position: 'relative',
                    paddingTop: '75%',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.3s ease'
                }}
            >
                {!product.imagen_url || imgError ? (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            color: isSelected ? '#9d0000' : theme.palette.text.disabled,
                            transition: 'color 0.3s ease'
                        }}
                    >
                        <Inventory2TwoToneIcon sx={{ fontSize: 48, opacity: isSelected ? 0.8 : 0.5, mb: 1 }} />
                        <Typography variant="caption">Sin Imagen</Typography>
                    </Box>
                ) : (
                    <CardMedia
                        component="img"
                        image={finalUrl}
                        alt={product.nombre}
                        onError={handleImageError}
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            p: 2,
                            zIndex: 0,
                            transition: 'transform 0.5s ease',
                            transform: isHovered ? 'scale(1.05) rotate(1deg)' : 'none',
                            filter: isSelected ? 'drop-shadow(0 4px 10px rgba(157, 0, 0, 0.2))' : 'none'
                        }}
                    />
                )}

                {/* Status Chip (Stock Warning) */}
                {product.inventario <= product.stockMinimo && (
                    <Chip
                        label="Stock Bajo"
                        color="error"
                        size="small"
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 2,
                            fontWeight: 'bold',
                            boxShadow: 2
                        }}
                    />
                )}
            </Box>

            {/* Content Section */}
            <CardContent sx={{ flexGrow: 1, p: 2, '&:last-child': { pb: 2 }, zIndex: 2 }}>
                <Typography
                    variant="h6"
                    component="div"
                    sx={{
                        fontWeight: 800,
                        fontSize: '1.3rem',
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        transition: 'all 0.3s ease',
                        background: isSelected
                            ? 'linear-gradient(to right, #9d0000, #640c0c)'
                            : 'none',
                        WebkitBackgroundClip: isSelected ? 'text' : 'none',
                        WebkitTextFillColor: isSelected ? 'transparent' : 'inherit',
                        color: isSelected ? 'transparent' : '#0f172a'
                    }}
                >
                    {product.nombre}
                </Typography>


                <Stack direction="row" sx={{ position: 'relative', zIndex: 2, justifyContent: 'center', mb: 1 }}>
                    <Tooltip title='Tipo de Paquete'>
                        <Chip
                            label={product.tipoPaquete}
                            variant="outlined"
                            sx={{
                                padding: '4px 8px',
                                border: isSelected ? '2px solid #9d0000' : '2px solid',
                                borderRadius: '14px',
                                fontSize: '.8rem',
                                height: 25,
                                fontWeight: 'bold',
                                color: isSelected ? '#9d0000' : 'inherit',
                                backgroundColor: isSelected ? 'white' : 'transparent',
                                transition: 'all 0.3s ease',
                                '& .MuiChip-label': {
                                    px: 0
                                }
                            }}
                        />
                    </Tooltip>
                </Stack>

                <Divider sx={{ mb: 2, borderStyle: 'dashed', borderColor: isSelected ? 'rgba(157, 0, 0, 0.2)' : 'rgba(0,0,0,0.12)' }} />

                {/* Details Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    {/* Inventory */}
                    <Box>
                        <Typography component="span" sx={labelStyle}>INVENTARIO</Typography>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: isSelected ? '#9d0000' : 'inherit', transition: 'color 0.3s ease' }}>
                            {product.inventario} <Typography component="span" variant="caption" color="text.secondary" sx={{ color: isSelected ? 'rgba(157, 0, 0, 0.6)' : 'inherit' }}>Total</Typography>
                        </Typography>
                    </Box>

                    {/* Packages/Units */}
                    <Box>
                        <Typography component="span" sx={labelStyle}>PAQ. / UNID.</Typography>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: isSelected ? '#9d0000' : 'inherit', transition: 'color 0.3s ease' }}>
                            {product.cantidadPaquetes} / {product.cantidadUnidades}
                        </Typography>
                    </Box>

                    {/* Venta Price */}
                    <Box>
                        <Typography component="span" sx={labelStyle}>VENTA</Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
                            <Typography variant="body2" fontWeight="bold" color={isSelected ? '#9d0000' : "success.main"} sx={{ transition: 'color 0.3s ease' }}>
                                C$ {product.precioVenta_Paq}
                            </Typography>
                        </Stack>
                    </Box>

                    {/* Compra Price */}
                    <Box>
                        <Typography component="span" sx={labelStyle}>COMPRA</Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
                            <Typography variant="body2" color={isSelected ? '#9d0000' : "text.secondary"} sx={{ transition: 'color 0.3s ease' }}>
                                C$ {product.precioCompra_Paq}
                            </Typography>
                        </Stack>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default memo(ProductCard);
