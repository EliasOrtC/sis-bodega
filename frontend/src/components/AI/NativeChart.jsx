import React, { useRef, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    Box, Typography, Paper, IconButton, Tooltip,
    Dialog, DialogContent, AppBar, Toolbar, Slide,
    Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
    ContentCopy, Download, Check,
    Fullscreen, Close, ZoomIn, ZoomOut,
    AspectRatio, FitScreen, PictureAsPdf, CropSquare, DesktopWindows
} from '@mui/icons-material';
import { copyElementToClipboard, downloadElementAsImage } from '../../utils/exportUtils';
import VisibilitySensor from './VisibilitySensor';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const NativeChart = React.memo(({ data, keepRendered = true }) => {
    const chartRef = useRef(null);
    const modalRef = useRef(null);
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);
    const [fontZoom, setFontZoom] = useState(0.7);
    const [anchorEl, setAnchorEl] = useState(null);
    const [format, setFormat] = useState(window.innerWidth < 780 ? '4:3' : 'auto'); // Móvil: Estándar (4:3), Escritorio: Automático

    const handleFormatClick = (event) => setAnchorEl(event.currentTarget);
    const handleFormatClose = (newFormat) => {
        if (newFormat) setFormat(newFormat);
        setAnchorEl(null);
    };

    const getFormatStyles = () => {
        const baseHeight = '70vh';
        switch (format) {
            case '16:9': return { aspectRatio: '16/9', height: 'auto', minHeight: 'unset' };
            case '4:3': return { aspectRatio: '4/3', height: 'auto', minHeight: 'unset' };
            case '1:1': return { aspectRatio: '1/1', height: 'auto', minHeight: 'unset' };
            case 'A4': return { width: '210mm', height: '297mm', minHeight: 'unset', mx: 'auto' };
            default: return { width: '100%', height: baseHeight };
        }
    };

    // Parseo seguro de datos usando useMemo
    const chartConfig = React.useMemo(() => {
        if (typeof data !== 'string') return data;
        try {
            return JSON.parse(data);
        } catch (e) {
            return null;
        }
    }, [data]);

    const handleCopy = async () => {
        const target = open ? modalRef.current : chartRef.current;
        const success = await copyElementToClipboard(target);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        const target = open ? modalRef.current : chartRef.current;
        downloadElementAsImage(target, `grafico-${title?.replace(/\s+/g, '_') || 'chart'}.png`);
    };

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handleZoomIn = () => setFontZoom(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setFontZoom(prev => Math.max(prev - 0.2, 0.5));

    // Normalización y procesamiento de datos centralizado para cumplir con Rules of Hooks
    const processed = React.useMemo(() => {
        if (!chartConfig) return null;

        // 1. Normalización de configuración base
        const chartType = (chartConfig.chartType || chartConfig.type || 'bar').toLowerCase().replace('chart', '');
        const title = chartConfig.title || 'Reporte';
        const rawData = chartConfig.data;

        // 1. Normalización de datos brutos
        let finalRawData = [];
        if (Array.isArray(rawData)) {
            finalRawData = rawData;
        } else if (rawData && rawData.labels && Array.isArray(rawData.datasets) && rawData.datasets[0]?.data) {
            finalRawData = rawData.labels.map((label, index) => ({
                name: label,
                value: rawData.datasets[0].data[index]
            }));
        } else if (rawData && typeof rawData === 'object') {
            finalRawData = Object.values(rawData).filter(v => typeof v === 'object' && v !== null);
        }

        // 2. Determinar etiquetas
        const datasetLabelFromChartJS = rawData?.datasets && rawData.datasets[0]?.label;
        const labelFromDataArray = Array.isArray(rawData) && rawData[0]?.label;
        const dataLabel = chartConfig.config?.yAxisLabel || datasetLabelFromChartJS || labelFromDataArray || 'Valor';

        // 3. Formatear datos para Recharts
        const chartData = finalRawData.map(item => ({
            ...item,
            name: item.name || item.fecha || item.date || item.label || item.producto || item.Producto || 'Sin nombre',
            value: Number(item.value || item.valor || item.cantidad || item.Cantidad || 0)
        }));

        // 4. Detectar claves de series (Multi-serie)
        const keysMap = {};
        chartData.forEach(item => {
            Object.keys(item).forEach(key => {
                const val = Number(item[key]);
                if (!['name', 'label', 'producto', 'Producto', 'fill', 'value'].includes(key) && !isNaN(val)) {
                    keysMap[key] = (keysMap[key] || 0) + val;
                }
            });
        });

        // Ordenar claves por volumen total (Descendente: los más vendidos primero para que queden "atrás")
        const dataKeys = Object.keys(keysMap).sort((a, b) => keysMap[b] - keysMap[a]);
        if (dataKeys.length === 0) dataKeys.push('value');

        const isStacked = chartConfig.config?.stacked === true;
        const isOverlay = chartConfig.config?.overlay === true || (!isStacked && dataKeys.length > 1 && dataKeys.length <= 5);

        return { chartData, dataKeys, dataLabel, chartType, title, isStacked, isOverlay };
    }, [chartConfig]);

    // Generar payload de leyenda manualmente (movido aquí para evitar error de hook condicional)
    const legendPayload = React.useMemo(() => {
        if (!processed) return [];
        const { chartType, chartData, dataKeys, dataLabel } = processed;

        // Colores definidos estáticamente aquí para acceso dentro del hook
        const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57', '#00c49f', '#0088fe', '#ffbb28'];

        if (chartType === 'pie') {
            return chartData.map((entry, index) => ({
                value: entry.name,
                color: entry.fill || COLORS[index % COLORS.length]
            }));
        }
        return dataKeys.map((key, index) => ({
            value: key === 'value' ? dataLabel : key,
            color: COLORS[index % COLORS.length]
        }));
    }, [processed]);

    const { chartData, dataKeys, dataLabel, chartType, title, isStacked, isOverlay } = processed;

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57', '#00c49f', '#0088fe', '#ffbb28'];

    const isDesktop = window.innerWidth >= 780;
    const desktopMultiplier = isDesktop ? 2 : 1;

    const baseFontSize = (open
        ? (chartData.length > 30 ? 8 : chartData.length > 20 ? 9 : chartData.length > 12 ? 11 : 12)
        : (chartData.length > 30 ? 4 : chartData.length > 20 ? 5 : chartData.length > 12 ? 6 : chartData.length > 6 ? 7 : 8)) * desktopMultiplier;

    const adaptiveFontSize = baseFontSize * fontZoom;

    const tickRotation = chartData.length > 8 ? -45 : 0;
    const xAxisHeight = open ? (chartData.length > 8 ? 80 : 40) : (chartData.length > 8 ? 45 : 30);

    const renderCustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.95)', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>{label}</Typography>
                    {payload.map((entry, index) => (
                        <Typography key={index} variant="body2" sx={{ color: entry.color || '#666', display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                            <span>{entry.name}:</span>
                            <span style={{ fontWeight: 'bold' }}>{entry.value}</span>
                        </Typography>
                    ))}
                </Paper>
            );
        }
        return null;
    };



    const renderCustomLegend = (payload) => {
        return (
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '8px 12px',
                mt: 1,
                maxHeight: open ? '150px' : '100px',
                overflowY: 'auto',
                px: 1,
                width: '100%',
                borderTop: '1px solid #f0f0f0',
                pt: 1
            }}>
                {payload.map((entry, index) => (
                    <Box key={`item-${index}`} sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <Box sx={{ width: open ? 10 : 8, height: open ? 10 : 8, bgcolor: entry.color, mr: 1, borderRadius: '2px', flexShrink: 0 }} />
                        <Tooltip title={entry.value} arrow>
                            <Typography variant="caption" sx={{ fontSize: (open ? 11 : 9) * fontZoom, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#555', fontWeight: 500 }}>
                                {entry.value}
                            </Typography>
                        </Tooltip>
                    </Box>
                ))}
            </Box>
        );
    };

    const renderChart = () => {
        const barSize = chartData.length > 20 ? 15 : chartData.length > 10 ? 25 : undefined;

        switch (chartType) {
            case 'bar':
                return (
                    <BarChart
                        data={chartData}
                        barGap={isOverlay ? -barSize || -20 : 2}
                        margin={{ top: 10, right: 10, left: isDesktop ? -5 : -30, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#666', fontSize: adaptiveFontSize }}
                            interval={0}
                            angle={tickRotation}
                            textAnchor={tickRotation < 0 ? 'end' : 'middle'}
                            height={xAxisHeight}
                            stroke="#ccc"
                        />
                        <YAxis tick={{ fill: '#666', fontSize: adaptiveFontSize }} stroke="#ccc" />
                        <ReTooltip content={renderCustomTooltip} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                        {dataKeys.map((key, index) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                name={key === 'value' ? dataLabel : key}
                                stackId={isStacked ? "a" : undefined}
                                fill={COLORS[index % COLORS.length]}
                                radius={isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                                barSize={isOverlay ? Math.max(40 - index * 8, 10) : undefined}
                                isAnimationActive={false}
                                animationDuration={300}
                            />
                        ))}
                    </BarChart>
                );
            case 'pie':
                // Pie chart solo soporta una serie, usamos la primera detectable o 'value'
                const pieKey = dataKeys[0] || 'value';
                return (
                    <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius="35%" outerRadius="75%" paddingAngle={2} dataKey={pieKey} nameKey="name" isAnimationActive={false} animationDuration={300}>
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <ReTooltip />
                    </PieChart>
                );
            case 'line':
                return (
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: isDesktop ? -5 : -35, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="name" tick={{ fill: '#666', fontSize: adaptiveFontSize }} interval={0} angle={tickRotation} textAnchor={tickRotation < 0 ? 'end' : 'middle'} height={xAxisHeight} />
                        <YAxis tick={{ fill: '#666', fontSize: adaptiveFontSize }} />
                        <ReTooltip content={renderCustomTooltip} />
                        {dataKeys.map((key, index) => (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                name={key === 'value' ? dataLabel : key}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                                isAnimationActive={false}
                                animationDuration={300}
                            />
                        ))}
                    </LineChart>
                );
            case 'area':
                return (
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: isDesktop ? -5 : -35, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="name" tick={{ fill: '#666', fontSize: adaptiveFontSize }} interval={0} angle={tickRotation} textAnchor={tickRotation < 0 ? 'end' : 'middle'} height={xAxisHeight} />
                        <YAxis tick={{ fill: '#666', fontSize: adaptiveFontSize }} />
                        <ReTooltip content={renderCustomTooltip} />
                        {dataKeys.map((key, index) => (
                            <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                name={key === 'value' ? dataLabel : key}
                                stroke={COLORS[index % COLORS.length]}
                                fill={COLORS[index % COLORS.length]}
                                fillOpacity={0.4}
                                stackId="1"
                                isAnimationActive={false}
                                animationDuration={300}
                            />
                        ))}
                    </AreaChart>
                );
            default:
                return (
                    <BarChart data={chartData}>
                        <XAxis dataKey="name" tick={{ fontSize: adaptiveFontSize }} />
                        <YAxis tick={{ fontSize: adaptiveFontSize }} />
                        <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                );
        }
    };

    return (
        <VisibilitySensor minHeight="350px" keepRendered={keepRendered}>
            <Box sx={{ position: 'relative', my: 2, width: '100%', '&:hover .chart-actions': { opacity: 1 } }}>
                {/* Botones de acción */}
                <Box className="chart-actions" sx={{
                    position: 'absolute', top: 5, right: 5, display: 'flex', gap: 0.5, opacity: 0,
                    transition: 'opacity 0.3s ease', zIndex: 5, bgcolor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)', borderRadius: '20px', p: '2px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.08)'
                }}>
                    <Tooltip title="Expandir">
                        <IconButton size="small" onClick={handleOpen} sx={{ color: '#666', p: 0.5 }}><Fullscreen sx={{ fontSize: '1rem' }} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Aumentar fuente">
                        <IconButton size="small" onClick={handleZoomIn} sx={{ color: '#666', p: 0.5 }}><ZoomIn sx={{ fontSize: '1rem' }} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Disminuir fuente">
                        <IconButton size="small" onClick={handleZoomOut} sx={{ color: '#666', p: 0.5 }}><ZoomOut sx={{ fontSize: '1rem' }} /></IconButton>
                    </Tooltip>
                    <Tooltip title={copied ? "¡Copiado!" : "Copiar imagen"}>
                        <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? '#4caf50' : '#666', p: 0.5 }}>
                            {copied ? <Check sx={{ fontSize: '1rem' }} /> : <ContentCopy sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Descargar PNG">
                        <IconButton size="small" onClick={handleDownload} sx={{ color: '#666', p: 0.5 }}><Download sx={{ fontSize: '1rem' }} /></IconButton>
                    </Tooltip>
                </Box>

                {/* Area con Scroll */}
                <Box
                    ref={chartRef}
                    className="native-chart-wrapper"
                    sx={{
                        width: '100%', maxWidth: '100%', height: title ? 'auto' : 'auto', minHeight: 250, bgcolor: 'white',
                        borderRadius: '16px', p: { xs: '12px 8px', sm: 2 }, boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(0,0,0,0.05)', boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'hidden',
                        display: 'flex', flexDirection: 'column'
                    }}
                >
                    {title && (
                        <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold', color: '#555', fontSize: '0.8rem', height: '20px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {title}
                        </Typography>
                    )}
                    <Box sx={{
                        width: '100%',
                        height: 250, // Altura fija para el gráfico
                        overflowX: 'auto',
                        overflowY: 'hidden'
                    }} className="native-chart-scroll-container">
                        <Box sx={{
                            width: '100%',
                            minWidth: chartData.length > 8 ? `${chartData.length * (open ? 60 : 35)}px` : '100%',
                            height: '100%',
                        }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {renderChart()}
                            </ResponsiveContainer>
                        </Box>
                    </Box>
                    {/* Render Leyenda Externa */}
                    {renderCustomLegend(legendPayload)}
                </Box>

                {/* Modal de expansión */}
                <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={Transition}>
                    <AppBar sx={{ position: 'sticky', top: 0, bgcolor: '#fff', color: '#333', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 1100 }}>
                        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
                            <IconButton edge="start" color="inherit" onClick={handleClose}><Close /></IconButton>
                            <Typography sx={{ ml: { xs: 1, sm: 2 }, flex: 1, fontWeight: 'bold', fontSize: { xs: '0.9rem', sm: '1.1rem' } }} variant="h6" noWrap>
                                {title || 'Vista Expandida'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: { xs: 0, sm: 1 } }}>
                                <Tooltip title="Cambiar Formato">
                                    <IconButton onClick={handleFormatClick} color="inherit">
                                        <AspectRatio fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => handleFormatClose()}>
                                    <MenuItem onClick={() => handleFormatClose('auto')}>
                                        <ListItemIcon><FitScreen fontSize="small" /></ListItemIcon>
                                        <ListItemText>Automático</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => handleFormatClose('16:9')}>
                                        <ListItemIcon><DesktopWindows fontSize="small" /></ListItemIcon>
                                        <ListItemText>16:9 (Presentación)</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => handleFormatClose('4:3')}>
                                        <ListItemIcon><AspectRatio fontSize="small" /></ListItemIcon>
                                        <ListItemText>4:3 (Estándar)</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => handleFormatClose('1:1')}>
                                        <ListItemIcon><CropSquare fontSize="small" /></ListItemIcon>
                                        <ListItemText>1:1 (Cuadrado)</ListItemText>
                                    </MenuItem>
                                    <MenuItem onClick={() => handleFormatClose('A4')}>
                                        <ListItemIcon><PictureAsPdf fontSize="small" /></ListItemIcon>
                                        <ListItemText>A4 (Reporte)</ListItemText>
                                    </MenuItem>
                                </Menu>
                                <IconButton size="small" onClick={handleZoomOut} color="inherit"><ZoomOut fontSize="small" /></IconButton>
                                <IconButton size="small" onClick={handleZoomIn} color="inherit"><ZoomIn fontSize="small" /></IconButton>
                                <Box sx={{ borderLeft: '1px solid #ddd', mx: 0.5 }} />
                                <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "inherit"}>{copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}</IconButton>
                                <IconButton size="small" onClick={handleDownload} color="inherit"><Download fontSize="small" /></IconButton>
                            </Box>
                        </Toolbar>
                    </AppBar>
                    <DialogContent sx={{
                        p: { xs: 1, sm: 4 },
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        overflow: 'auto',
                        bgcolor: '#f5f5f5',
                        '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '10px' }
                    }}>
                        <Box ref={modalRef} sx={{
                            width: format === 'A4' ? '210mm' : { xs: '100%', sm: '95%' },
                            minWidth: format === 'auto' ? { xs: 'unset', sm: '90%' } : 'unset',
                            height: 'auto',
                            minHeight: 'unset',
                            bgcolor: '#fff',
                            p: { xs: '15px 10px 6px 10px', sm: 2.5 }, // Reducido padding lateral en móvil (10px)
                            border: '1px solid #eee',
                            borderRadius: format === 'A4' ? '0' : '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            ...getFormatStyles()
                        }}>
                            {title && <Typography variant="h6" sx={{ mb: { xs: 1, sm: 3 }, textAlign: 'center', fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem' } }}>{title}</Typography>}
                            {/* Layout Flex para Modal: Chart + Legend */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                <Box sx={{ flex: 1, width: '100%', minHeight: format === 'auto' ? '300px' : 'unset' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        {renderChart()}
                                    </ResponsiveContainer>
                                </Box>
                                {/* Leyenda en el pie del contenido del modal */}
                                {renderCustomLegend(legendPayload)}
                            </Box>
                        </Box>
                    </DialogContent>
                </Dialog>
            </Box>
        </VisibilitySensor>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to ensure React.memo works efficiently
    return prevProps.data === nextProps.data && prevProps.keepRendered === nextProps.keepRendered;
});

export default NativeChart;
