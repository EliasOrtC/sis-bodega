import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import {
    Box, IconButton, Tooltip, Dialog, DialogContent,
    AppBar, Toolbar, Typography, Slide, Menu, MenuItem, ListItemIcon, ListItemText
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


// Configuración global de Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        primaryColor: '#ff4444',
        primaryTextColor: '#000000',
        primaryBorderColor: '#333333',
        lineColor: '#ff4444',
        secondaryColor: '#00e5ff',
        tertiaryColor: '#8e24aa',
        mainBkg: '#ffffff',
        nodeBorder: '#333333',
        clusterBkg: '#f9f9f9',
        titleColor: '#000000',
        edgeLabelBackground: '#ffffff',
        nodeTextColor: '#000000'
    },
    securityLevel: 'loose',
    flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: false },
    gantt: { useMaxWidth: false },
    common: { useMaxWidth: false }
});

const Mermaid = React.memo(({ chart, isStreaming, keepRendered = true }) => {
    const [containerElement, setContainerElement] = useState(null);
    const modalRef = useRef(null);
    const containerId = React.useMemo(() => `mermaid-${Math.random().toString(36).substr(2, 9)}`, []);
    const lastValidContent = useRef("");
    const [copied, setCopied] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [open, setOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [containerHeight, setContainerHeight] = useState('250px');
    const [format, setFormat] = useState(window.innerWidth < 600 ? '1:1' : 'auto'); // Móvil: 1:1, Escritorio: Auto

    const handleFormatClick = (event) => setAnchorEl(event.currentTarget);
    const handleFormatClose = (newFormat) => {
        if (newFormat) setFormat(newFormat);
        setAnchorEl(null);
    };

    const handleCopy = async () => {
        const target = open ? modalRef.current : containerElement;
        const success = await copyElementToClipboard(target);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        const target = open ? modalRef.current : containerElement;
        downloadElementAsImage(target, `diagrama-${containerId}.png`);
    };

    const handleZoomIn = () => setZoom(prev => Math.min(Math.round((prev + 0.2) * 10) / 10, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(Math.round((prev - 0.2) * 10) / 10, 0.5));
    const handleResetZoom = () => setZoom(1);

    const handleOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        setZoom(1);
    };

    // --- GESTOS DE ZOOM (Touchpad, Mouse Wheel + Ctrl, Touch Mobile) ---
    useEffect(() => {
        if (!open || !modalRef.current) return;

        const container = modalRef.current;
        let lastTouchDistance = 0;

        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                // Sensibilidad equilibrada para respuesta instantánea
                const delta = e.deltaY > 0 ? -0.05 : 0.05;
                setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5));
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );

                if (lastTouchDistance > 0) {
                    // Zoom táctil reactivo: divisor 250 para mayor agilidad instantánea
                    const delta = (dist - lastTouchDistance) / 250;
                    setZoom(prev => {
                        const newZoom = Math.min(Math.max(prev + delta, 0.5), 5);
                        return Math.round(newZoom * 100) / 100; // Round to 2 decimals for touch
                    });
                }
                lastTouchDistance = dist;
            }
        };

        const handleTouchEnd = () => {
            lastTouchDistance = 0;
        };

        // Attach listeners
        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [open, zoom]);

    const cleanMermaidSyntax = (text) => {
        if (!text) return "";
        let rawText = text
            .replace(/\\n/g, '\n')
            .replace(/^```mermaid\n?/, "")
            .replace(/```$/, "")
            .trim();

        rawText = rawText.replace(/([\]\)\}])\s*([a-zA-Z0-9_-]+)\s*([\[\(\{])/g, '$1; $2$3');
        rawText = rawText.replace(/([\]\)\}])\s*([a-zA-Z0-9_-]+)\s*(-->|---|==>)/g, '$1; $2 $3');

        let rawLines = rawText.split(/[\n;]/);
        let cleanedLines = [];
        let hasHeader = false;
        let subgraphCount = 0;
        let endCount = 0;
        const headers = ["graph", "flowchart", "sequenceDiagram", "pie", "gantt", "classDiagram", "stateDiagram", "erDiagram"];

        for (let line of rawLines) {
            let tr = line.trim();
            if (!tr) continue;

            if (!hasHeader && headers.some(h => tr.toLowerCase().startsWith(h))) {
                cleanedLines.push(tr);
                hasHeader = true;
                continue;
            }
            if (hasHeader && headers.some(h => tr.toLowerCase().startsWith(h))) continue;

            if (tr.toLowerCase().startsWith('subgraph')) {
                subgraphCount++;
                let content = tr.substring(8).trim().replace(/{$/, "").trim();
                let label = content.replace(/^["']+/, "").replace(/["']+$/, "");
                cleanedLines.push(`subgraph "${label.replace(/"/g, "'")}"`);
                continue;
            }
            if (tr.toLowerCase() === 'end') {
                endCount++;
                cleanedLines.push('end');
                continue;
            }

            let p = tr;
            const skipRepair = ["style", "fill", "stroke", "subgraph", "end", "direction"].some(word => p.toLowerCase().includes(word));

            if (!skipRepair) {
                p = p.replace(/([a-zA-Z0-9_-]+)\s*([\[\(\{])(.*?)(?=\s*(-->|---|==>|;|$))/g, (match, id, start, label) => {
                    const closeMap = { '[': ']', '(': ')', '{': '}', 'default': ']' };
                    const expectedClose = closeMap[start] || ']';
                    let l = label.trim();
                    if (l.endsWith(expectedClose)) l = l.substring(0, l.length - 1).trim();
                    l = l.replace(/^["']+/, "").replace(/["']+$/, "").replace(/"/g, "'");
                    return `${id}${start}"${l}"${expectedClose}`;
                });
                p = p.replace(/([a-zA-Z0-9_-]+)["']?\s*--\s*([^"\]\n]+)["'\]]+\s*(-->|---|==>)\s*([a-zA-Z0-9_-]+)/g, (m, nodeFrom, label, arrow, nodeTo) => {
                    return `${nodeFrom} ${arrow}|${label.trim()}| ${nodeTo}`;
                });
                p = p.replace(/(-->|---|==>)\s*\|([^|\n]+)\|/g, (m, arrow, label) => {
                    let l = label.trim().replace(/^["']+/, "").replace(/["']+$/, "").replace(/"/g, "'");
                    return `${arrow}|${l}|`;
                });
                p = p.replace(/\|([^|]+)\|\s*>/g, '|$1|');
                p = p.replace(/(-->|---|==>)\s*["']([^"'\n]+)["']\s*(-->|---|==>)/g, '$1 $2 $3');
                p = p.replace(/(-->|---|==>)\s*["']([^"'\n]+)["']\s*([a-zA-Z0-9_-]+)/g, '$1 $2 $3');
                p = p.replace(/--\s+>/g, '-->');
                p = p.replace(/[.;]+$/, "");
            }
            cleanedLines.push(p);
        }

        while (subgraphCount > endCount) {
            cleanedLines.push('end');
            endCount++;
        }

        if (!hasHeader) cleanedLines.unshift("graph TD");
        return cleanedLines.join('\n');
    };

    useEffect(() => {
        let isCancelled = false;
        // Si está streameando, usaremos una lógica más simple o esperaremos
        // Si no es visible, VisibilitySensor desmontará este componente, así que este efecto se limpiará.

        const renderDiagram = async () => {
            const targetEl = open ? modalRef.current : containerElement;
            if (!targetEl || !chart) return;

            const cleanChart = cleanMermaidSyntax(chart);

            try {
                // Generar un ID único para esta renderización específica para evitar colisiones
                // de IDs internos de Mermaid cuando el componente se desmonta y remonta
                const renderId = `${containerId}-${open ? 'modal' : 'inline'}-${Date.now()}`;

                // Limpiar cualquier elemento huérfano (aunque mermaid debería manejarlo)
                const existing = document.getElementById(renderId);
                if (existing) existing.remove();

                const { svg } = await mermaid.render(renderId, cleanChart);
                if (isCancelled) return;
                // Re-check existence of target element as it might have unmounted during async render
                const currentTarget = open ? modalRef.current : containerElement;
                if (!currentTarget) return;

                const svgContainer = currentTarget.querySelector('.mermaid-svg-container');
                if (svgContainer) {
                    svgContainer.innerHTML = svg;
                    const svgElement = svgContainer.querySelector('svg');

                    if (svgElement) {
                        svgElement.style.display = 'block';
                        svgElement.style.margin = '0 auto';
                        svgElement.style.maxWidth = 'none';

                        // Ajustar dimensiones según viewBox y nivel de zoom
                        const viewBox = svgElement.getAttribute("viewBox");
                        if (viewBox) {
                            const vb = viewBox.split(' ');
                            const w = parseFloat(vb[2]);
                            const h = parseFloat(vb[3]);
                            const ratio = w / h;

                            if (open) {
                                // Lógica de formato en el modal
                                let scaleFactor = zoom * (window.innerWidth / w) * 0.8;

                                if (format === '16:9') {
                                    const targetW = window.innerWidth * 0.9;
                                    svgElement.style.width = `${targetW * zoom}px`;
                                    svgElement.style.height = `${(targetW * 9 / 16) * zoom}px`;
                                } else if (format === 'A4') {
                                    svgElement.style.width = `${210 * 3.78 * zoom}px`; // mm to px approx
                                    svgElement.style.height = `${297 * 3.78 * zoom}px`;
                                } else {
                                    const finalW = w * scaleFactor;
                                    const finalH = h * scaleFactor;
                                    svgElement.style.width = `${finalW}px`;
                                    svgElement.style.height = `${finalH}px`;
                                }
                            } else {
                                // En el chat, el zoom es relativo al ancho del contenedor
                                // Usamos un epsilon pequeño para evitar errores de punto flotante
                                if (Math.abs(zoom - 1) < 0.01) {
                                    // Resetear a comportamiento fluido
                                    svgElement.style.width = '100%';
                                    svgElement.style.height = 'auto';
                                    svgElement.style.maxWidth = '100%';
                                } else {
                                    // Aplicar zoom fijo
                                    svgElement.style.width = `${100 * zoom}%`;
                                    svgElement.style.height = 'auto';
                                    svgElement.style.maxWidth = 'none'; // Permitir que exceda el contenedor al hacer zoom
                                }

                                // Si es muy vertical, limitamos la altura base SOLO si no estamos reseteando el zoom
                                if (ratio < 0.8 && Math.abs(zoom - 1) < 0.01) {
                                    svgElement.style.height = '400px';
                                    svgElement.style.width = 'auto';
                                }
                            }
                        }
                    }
                    if (!open) {
                        lastValidContent.current = cleanChart;
                        // Guardar la altura real del CONTENIDO (svg) + padding para permitir que el contenedor se encoja
                        // Si medimos currentTarget.offsetHeight, nos quedamos atrapados por el minHeight previo
                        const svgElement = currentTarget.querySelector('svg');
                        if (svgElement && Math.abs(zoom - 1) < 0.01) {
                            const contentHeight = svgElement.getBoundingClientRect().height;
                            // 40px padding vertical + 2px borde + un pequeño margen de seguridad
                            setContainerHeight(`${Math.min(contentHeight + 25, 550)}px`);
                        }
                    }
                }
            } catch (err) {
                console.error("Mermaid Render Error:", err);
            }
        };

        const timeout = setTimeout(renderDiagram, 50);
        return () => {
            isCancelled = true;
            clearTimeout(timeout);
        };
    }, [chart, isStreaming, containerId, zoom, open, format, containerElement]); // format and containerElement added to deps

    return (
        <VisibilitySensor minHeight={containerHeight} keepRendered={keepRendered}>
            <Box sx={{
                position: 'relative',
                margin: '15px 0',
                width: '100%',
                '&:hover .mermaid-actions': { opacity: 1 }
            }}>
                {/* Botones de acción (fijos respecto al componente) */}
                {!isStreaming && (
                    <Box className="mermaid-actions" sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        display: 'flex',
                        gap: 0.5,
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        zIndex: 2,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '20px',
                        p: '2px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(0,0,0,0.08)'
                    }}>
                        <Tooltip title="Expandir">
                            <IconButton size="small" onClick={handleOpen} sx={{ color: '#666' }}>
                                <Fullscreen fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Aumentar zoom">
                            <IconButton size="small" onClick={handleZoomIn} sx={{ color: '#666' }}>
                                <ZoomIn fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Disminuir zoom">
                            <IconButton size="small" onClick={handleZoomOut} sx={{ color: '#666' }}>
                                <ZoomOut fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={copied ? "¡Copiado!" : "Copiar imagen"}>
                            <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? '#4caf50' : '#666' }}>
                                {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Descargar PNG">
                            <IconButton size="small" onClick={handleDownload} sx={{ color: '#666' }}>
                                <Download fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}

                {/* Area con Scroll */}
                <Box
                    ref={setContainerElement}
                    sx={{
                        background: '#ffffff',
                        p: { xs: '15px 10px 6px 10px', sm: 2.5 },
                        borderRadius: '16px',
                        display: 'block',
                        width: '100%',
                        overflowX: 'auto',
                        overflowY: 'auto',
                        maxHeight: '550px',
                        boxSizing: 'border-box',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        color: '#000000',
                        fontFamily: 'arial',
                        border: '1px solid rgba(0,0,0,0.05)',
                        height: containerHeight, // Usar height fijo en lugar de minHeight para evitar estiramiento al hacer zoom
                        '&::-webkit-scrollbar': { height: '6px', width: '6px' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '10px' }
                    }}
                    className="mermaid-container"
                >
                    <div className="mermaid-svg-container" style={{ width: '100%', minHeight: '80px' }} />
                </Box>

                {/* Modal de expansión */}
                <Dialog
                    fullScreen
                    open={open}
                    onClose={handleClose}
                    TransitionComponent={Transition}
                    PaperProps={{
                        sx: { bgcolor: '#f8f9fa' }
                    }}
                >
                    <AppBar sx={{ position: 'sticky', top: 0, bgcolor: '#ffffff', color: '#333', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 1100 }}>
                        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
                            <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
                                <Close />
                            </IconButton>{/* 
                            <Typography sx={{ ml: { xs: 1, sm: 2 }, flex: 1, fontWeight: 'bold', fontSize: { xs: '0.9rem', sm: '1.1rem' } }} variant="h6" noWrap>
                                Vista Expandida
                            </Typography> */}
                            <Box sx={{ display: 'flex', gap: { xs: 0, sm: 0.5 } }}>
                                <Tooltip title="Formato">
                                    <IconButton size="small" onClick={handleFormatClick} color="inherit">
                                        <AspectRatio fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => handleFormatClose()}>
                                    <MenuItem onClick={() => handleFormatClose('auto')}><ListItemIcon><FitScreen fontSize="small" /></ListItemIcon><ListItemText>Automático</ListItemText></MenuItem>
                                    <MenuItem onClick={() => handleFormatClose('16:9')}><ListItemIcon><DesktopWindows fontSize="small" /></ListItemIcon><ListItemText>16:9 Wide</ListItemText></MenuItem>
                                    <MenuItem onClick={() => handleFormatClose('1:1')}><ListItemIcon><CropSquare fontSize="small" /></ListItemIcon><ListItemText>1:1 Cuadrado</ListItemText></MenuItem>
                                    <MenuItem onClick={() => handleFormatClose('A4')}><ListItemIcon><PictureAsPdf fontSize="small" /></ListItemIcon><ListItemText>A4 Vertical</ListItemText></MenuItem>
                                </Menu>
                                <Box sx={{ borderLeft: '1px solid #ddd', mx: 0.5 }} />
                                <IconButton size="small" onClick={handleZoomOut}><ZoomOut fontSize="small" /></IconButton>
                                <IconButton size="small" onClick={handleZoomIn}><ZoomIn fontSize="small" /></IconButton>
                                <Box sx={{ borderLeft: '1px solid #ddd', mx: { xs: 0.5, sm: 1 } }} />
                                <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "inherit"}>{copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}</IconButton>
                                <IconButton size="small" onClick={handleDownload} color="inherit"><Download fontSize="small" /></IconButton>
                            </Box>
                        </Toolbar>
                    </AppBar>
                    <DialogContent sx={{
                        p: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'auto',
                        bgcolor: '#fff',
                        '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '10px' }
                    }}>
                        <Box
                            ref={modalRef}
                            className="mermaid-container"
                            sx={{
                                p: { xs: 1.5, sm: 4 }, // Padding más ajustado en móvil
                                width: 'fit-content',
                                minWidth: { xs: 'unset', sm: '100%' }, // Permitir encogimiento en móvil para exportación exacta
                                height: 'auto',
                                minHeight: 'unset',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                                bgcolor: '#fff',
                                ...(zoom > 1.2 && { justifyContent: 'flex-start' })
                            }}
                        >
                            <div className="mermaid-svg-container" style={{ width: 'auto', height: 'auto' }} />
                        </Box>
                    </DialogContent>
                </Dialog>
            </Box>
        </VisibilitySensor>
    );
}, (prevProps, nextProps) => {
    return prevProps.chart === nextProps.chart &&
        prevProps.isStreaming === nextProps.isStreaming &&
        prevProps.keepRendered === nextProps.keepRendered;
});

export default Mermaid;
