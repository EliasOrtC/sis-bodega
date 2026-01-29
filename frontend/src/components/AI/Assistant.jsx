import React, { useState, useRef, useEffect } from 'react';
import { IconButton, Paper, Typography, Box, TextField, InputAdornment, CircularProgress, Tooltip, Dialog, DialogContent, Zoom, useMediaQuery, useTheme, Fab } from '@mui/material';
import { Send, SmartToy, Close, History, DeleteSweep, Whatshot, Bolt, HistoryEdu, Stop, Edit, ContentCopy, Description, TableView, Check, KeyboardArrowDown } from '@mui/icons-material';
import { Button } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import * as XLSX from 'xlsx';
import NativeChart from './NativeChart';
import Mermaid from './Mermaid';
import VisibilitySensor from './VisibilitySensor';
import { API_BASE_URL } from '../../utils/config';
import { exportToExcel, exportToWord, cleanMarkdown, copyMessageToClipboard } from '../../utils/exportUtils';
import '../../styles/Assistant.css';

// Contexto para controlar la política de renderizado de visuales
const RenderPolicyContext = React.createContext({ keepRendered: true, fullMarkdown: '', isStreaming: false });

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Zoom ref={ref} {...props} />;
});

const AVAILABLE_MODELS = [
    { name: 'Gemini 2.5 Flash', provider: 'google', model: 'gemini-2.5-flash', icon: 'gemini' },
    { name: 'Gemini Lite', provider: 'google', model: 'gemini-2.5-flash-lite', icon: 'gemini' },
    { name: 'Llama 3.3 (Groq)', provider: 'groq', model: 'llama-3.3-70b-versatile', icon: 'groq' },
    { name: 'Llama 3.1 (Groq)', provider: 'groq', model: 'llama-3.1-8b-instant', icon: 'groq' },
    { name: 'GLM 4.5 Air (Z.AI)', provider: 'openrouter', model: 'z-ai/glm-4.5-air:free', icon: 'openrouter' },
];

const WELCOME_MESSAGE = '¡Hola! Soy tu asistente de SIS-Bodega. ¿En qué puedo ayudarte hoy?';
const HISTORY_CLEARED_MESSAGE = '¡Historial limpiado! ¿Hay algo más en lo que pueda ayudarte?';

const SmartTableRow = React.memo(({ children, isHeader }) => {
    const cells = React.Children.toArray(children);

    // Función para extraer texto plano y manejar <br>
    const getLines = (node) => {
        const lines = [];
        let currentLine = [];

        const process = (n) => {
            if (!n) return;
            if (Array.isArray(n)) {
                n.forEach(process);
            } else if (React.isValidElement(n) && n.type === 'br') {
                lines.push(currentLine);
                currentLine = [];
            } else if (React.isValidElement(n) && n.props && n.props.children) {
                process(n.props.children);
            } else {
                currentLine.push(n);
            }
        };

        process(node);
        lines.push(currentLine);
        return lines;
    };

    const splittedContent = cells.map(cell => getLines(cell.props.children));
    const maxLines = Math.max(...splittedContent.map(l => l.length));

    if (maxLines <= 1) {
        return <tr style={{ borderBottom: isHeader ? '2px solid #eee' : '1px solid #f5f5f5' }}>{children}</tr>;
    }

    const physicalRows = [];
    for (let i = 0; i < maxLines; i++) {
        const rowCells = splittedContent.map((lines, colIdx) => {
            const originalCell = cells[colIdx];
            const cellTag = isHeader ? 'th' : 'td';

            if (lines.length === 1) {
                if (i === 0) {
                    return React.createElement(cellTag, {
                        ...originalCell.props,
                        key: colIdx,
                        rowSpan: maxLines,
                        style: { ...originalCell.props.style, verticalAlign: 'middle' },
                        children: lines[0]
                    });
                }
                return null;
            } else {
                return React.createElement(cellTag, {
                    ...originalCell.props,
                    key: `${colIdx}-${i}`,
                    style: { ...originalCell.props.style, borderTop: i > 0 ? 'none' : undefined },
                    children: lines[i] || ''
                });
            }
        }).filter(Boolean);

        physicalRows.push(
            <tr key={i} style={{ borderBottom: i === maxLines - 1 ? (isHeader ? '2px solid #eee' : '1px solid #f5f5f5') : 'none' }}>
                {rowCells}
            </tr >
        );
    }
    return <>{physicalRows}</>;
}, (prev, next) => {
    // Si el contenido es igual, no re-renderizar la fila
    if (prev.isHeader !== next.isHeader) return false;
    const prevCells = React.Children.toArray(prev.children);
    const nextCells = React.Children.toArray(next.children);
    if (prevCells.length !== nextCells.length) return false;
    for (let i = 0; i < prevCells.length; i++) {
        if (prevCells[i].props.children !== nextCells[i].props.children) return false;
    }
    return true;
});

const MarkdownTable = React.memo((props) => {
    const tableRef = React.useRef(null);
    const { fullMarkdown, isStreaming } = React.useContext(RenderPolicyContext);

    const handleExportExcel = () => {
        if (tableRef.current) {
            exportToExcel(tableRef.current, fullMarkdown);
        }
    };

    return (
        <Box className="ai-table-wrapper">
            {!isStreaming && (
                <Tooltip title="Exportar esta tabla a Excel" arrow>
                    <IconButton
                        size="small"
                        className="ai-table-export-btn"
                        onClick={handleExportExcel}
                    >
                        <div className="logo-excel-btn" />
                    </IconButton>
                </Tooltip>
            )}
            <div className="ai-table-scroll-container">
                <table ref={tableRef}>
                    {React.Children.map(props.children, child => {
                        if (child && (child.type === 'thead' || child.type === 'tbody')) {
                            return React.cloneElement(child, {
                                children: React.Children.map(child.props.children, tr => {
                                    if (tr && tr.type === 'tr') {
                                        return <SmartTableRow isHeader={child.type === 'thead'}>{tr.props.children}</SmartTableRow>;
                                    }
                                    return tr;
                                })
                            });
                        }
                        return child;
                    })}
                </table>
            </div>
        </Box>
    );
});

const CopyButton = React.memo(({ content, messageElement, setIsExporting }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        setIsExporting(true);
        // Pequeño delay para dejar que React renderice lo que estaba oculto
        setTimeout(async () => {
            const result = await copyMessageToClipboard(content, messageElement);
            if (result) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
            setIsExporting(false);
        }, 300);
    };

    return (
        <Tooltip title={copied ? "¡Copiado!" : "Copiar mensaje"} arrow>
            <IconButton
                className={`ai-message-action-btn copy-btn-custom ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                sx={{ color: copied ? '#4caf50 !important' : 'inherit' }}
            >
                {copied ? <Check sx={{ fontSize: '18px' }} /> : <ContentCopy sx={{ fontSize: '18px' }} />}
            </IconButton>
        </Tooltip>
    );
});

const MessageBubble = React.memo(({ msg, index, visualIndices, markdownComponents, streamingComponents, WELCOME_MESSAGE, HISTORY_CLEARED_MESSAGE, handleEditMessage, isExporting, setIsExporting }) => {
    const messageRef = React.useRef(null);
    const isStreaming = msg.isStreaming || (msg.fullContent && (msg.content?.length || 0) < (msg.fullContent?.length || 0));

    return (
        <Box className={`ai-message-wrapper ${msg.role}`} key={index}>
            {msg.role === 'user' && (
                <Tooltip title="Editar" arrow placement="top">
                    <IconButton
                        className="edit-message-btn"
                        size="small"
                        onClick={() => handleEditMessage(index, msg.content)}
                        sx={{
                            mr: 1,
                            opacity: 0,
                            transition: 'all 0.2s',
                            color: '#aaa',
                            '&:hover': { color: '#8a1010', backgroundColor: 'rgba(138, 16, 16, 0.05)' }
                        }}
                    >
                        <Edit fontSize="small" style={{ fontSize: '16px' }} />
                    </IconButton>
                </Tooltip>
            )}
            <Box
                ref={messageRef}
                className={`ai-message-bubble ${msg.role} ${isStreaming ? 'streaming' : ''}`}
            >
                {msg.role === 'assistant' ? (
                    <RenderPolicyContext.Provider value={{
                        keepRendered: isExporting || visualIndices.includes(index),
                        fullMarkdown: msg.content,
                        isStreaming: isStreaming
                    }}>
                        <div className="ai-markdown-content">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={isStreaming ? streamingComponents : markdownComponents}
                            >
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                    </RenderPolicyContext.Provider>
                ) : (
                    msg.content
                )}

                {/* Icono del modelo usado (solo para el asistente) */}
                {msg.role === 'assistant' && msg.modelInfo && (
                    <Tooltip
                        title={`${msg.modelInfo.name}`}
                        arrow
                        placement="top-end"
                        PopperProps={{ sx: { zIndex: 2500 } }}
                    >
                        <Box className="ai-message-model-tag">
                            <div className={`logo-${msg.modelInfo.icon} ai-quota-icon`} style={{ width: 12, height: 12 }} />
                        </Box>
                    </Tooltip>
                )}

                {/* Acciones del mensaje */}
                {(() => {
                    if (msg.role !== 'assistant' || isStreaming) return null;
                    if (msg.content === WELCOME_MESSAGE || msg.content === HISTORY_CLEARED_MESSAGE) return null;

                    // 1. Ocultar si fue abortada
                    const isAborted = msg.content.includes('(Petición cancelada por el usuario)') ||
                        msg.content.includes('(Respuesta interrumpida)');
                    if (isAborted) return null;

                    // 2. Verificar visuales (Gráficos, Mermaid)
                    const hasVisuals = msg.content.includes('"chartType"') ||
                        msg.content.includes('"diagramType"') ||
                        msg.content.includes('"graph"') ||
                        msg.content.includes('```mermaid');

                    // 3. Regla de 10 líneas (si no tiene visuales)
                    if (!hasVisuals) {
                        const lines = msg.content.split('\n').filter(l => l.trim().length > 0);
                        if (lines.length < 10) return null;
                    }

                    return (
                        <Box className="ai-message-actions">
                            <CopyButton content={msg.content} messageElement={messageRef.current} setIsExporting={setIsExporting} />
                            <Tooltip title="Exportar a Word">
                                <IconButton
                                    className="ai-message-action-btn"
                                    onClick={() => {
                                        setIsExporting(true);
                                        setTimeout(async () => {
                                            await exportToWord(msg.content, messageRef.current);
                                            setIsExporting(false);
                                        }, 300);
                                    }}
                                >
                                    <div className="logo-word-btn" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    );
                })()}
            </Box>
        </Box>
    );
}, (prevProps, nextProps) => {
    // Optimización: Solo re-renderizar si el contenido cambia o si el estado de streaming cambia
    // O si cambia el índice de visualización (para desmontar visuales pesados)
    const prevStreaming = prevProps.msg.isStreaming || (prevProps.msg.fullContent && (prevProps.msg.content?.length || 0) < (prevProps.msg.fullContent?.length || 0));
    const nextStreaming = nextProps.msg.isStreaming || (nextProps.msg.fullContent && (nextProps.msg.content?.length || 0) < (nextProps.msg.fullContent?.length || 0));

    return (
        prevProps.msg.content === nextProps.msg.content &&
        prevProps.msg.role === nextProps.msg.role &&
        prevStreaming === nextStreaming &&
        prevProps.markdownComponents === nextProps.markdownComponents &&
        prevProps.streamingComponents === nextProps.streamingComponents &&
        prevProps.visualIndices?.includes(prevProps.index) === nextProps.visualIndices?.includes(nextProps.index)
    );
});

const Assistant = ({ isOpen, onClose }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [message, setMessage] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [chatHistory, setChatHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('ai_chat_history');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed.map(msg => ({
                        ...msg,
                        content: msg?.content || '',
                        isStreaming: false
                    }));
                }
            }
        } catch (e) {
            console.error("Error parsing chat history", e);
        }
        return [
            { id: 'welcome-' + Date.now(), role: 'assistant', content: '', fullContent: WELCOME_MESSAGE, isStreaming: true, isSystem: true }
        ];
    });
    const [isLoading, setIsLoading] = useState(false);
    const [quota, setQuota] = useState(null);
    const [showQuota, setShowQuota] = useState(false);
    const [isBlurActive, setIsBlurActive] = useState(false);
    const [selectedAI, setSelectedAI] = useState(AVAILABLE_MODELS[0]);
    const [showModelSelector, setShowModelSelector] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
    const [fallbackMessage, setFallbackMessage] = useState(null);
    const isFirstOpen = useRef(true);
    const hasManuallySelected = useRef(false); // Para no sobreescribir elección del usuario involuntariamente

    const markdownComponents = React.useMemo(() => ({
        code: (props) => (
            <RenderPolicyContext.Consumer>
                {({ keepRendered }) => {
                    const { inline, className, children } = props;
                    const match = /language-(\w+)/.exec(className || '');
                    const content = String(children).replace(/\n$/, '');

                    if (!inline && match && match[1] === 'json') {
                        if (content.includes('"chartType"')) {
                            return <NativeChart data={content} keepRendered={keepRendered} /> || <code {...props} />;
                        }
                        if (content.includes('"diagramType"') || content.includes('"graph"')) {
                            try {
                                const parsed = JSON.parse(content);
                                const mermaidCode = parsed.graph || parsed.code || content;
                                return <Mermaid chart={mermaidCode} isStreaming={false} keepRendered={keepRendered} />;
                            } catch (e) { }
                        }
                    }

                    if (!inline && match && match[1] === 'mermaid') {
                        return <Mermaid chart={content} isStreaming={false} keepRendered={keepRendered} />;
                    }

                    return <code {...props} />;
                }}
            </RenderPolicyContext.Consumer>
        ),
        table: MarkdownTable
    }), []);

    const streamingComponents = React.useMemo(() => ({
        ...markdownComponents,
        code: (props) => {
            const { inline, className, children } = props;
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';

            if (!inline && (lang === 'mermaid' || lang === 'json')) {
                const content = String(children).replace(/\n$/, '');
                if (lang === 'json' && !content.includes('"chartType"') && !content.includes('"graph"') && !content.includes('"diagramType"')) {
                    return markdownComponents.code(props);
                }

                return (
                    <Box sx={{
                        p: 3, my: 2, borderRadius: '16px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', minHeight: '140px',
                        border: '1px dashed rgba(138, 16, 16, 0.2)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,248,248,0.95))',
                        backdropFilter: 'blur(4px)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                    }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                            <CircularProgress size={32} sx={{ color: '#8a1010' }} thickness={2} />
                            <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className={`logo-${selectedAI.icon} ai-quota-icon`} style={{ width: 14, height: 14, opacity: 0.5 }} />
                            </Box>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#333', fontWeight: 600, letterSpacing: '0.5px' }}>
                            {lang === 'mermaid' ? 'GENERANDO DIAGRAMA...' : 'PREPARANDO GRÁFICO...'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888', mt: 1, fontStyle: 'italic' }}>
                            {selectedAI.name} está procesando...
                        </Typography>
                    </Box>
                );
            }
            return markdownComponents.code(props);
        }
    }), [markdownComponents, selectedAI]);

    const fetchQuota = async () => {
        try {
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
            const token = userStr ? JSON.parse(userStr).token : '';
            const response = await fetch(`${API_BASE_URL}/ai/quota`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setQuota(data);
            }
        } catch (e) {
            console.error("Error fetching quota", e);
        }
    };

    const lastScrollUpdate = useRef(0);
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (clientHeight <= 0) return; // Evitar cálculos erróneos si el componente no se ha renderizado bien

        const now = Date.now();
        if (now - lastScrollUpdate.current < 100) return;

        lastScrollUpdate.current = now;

        // El botón solo debe mostrarse si existe un scroll significativo (> 100px)
        // Y si el usuario está lejos del fondo (> 400px)
        const canScroll = scrollHeight > clientHeight + 100;
        const isFarFromBottom = canScroll && (scrollHeight - scrollTop - clientHeight > 400);

        if (showScrollBottomBtn !== isFarFromBottom) {
            setShowScrollBottomBtn(isFarFromBottom);
        }
    };

    const scrollToBottom = (behavior = "smooth") => {
        if (messagesContainerRef.current) {
            // Un solo scroll a veces no es suficiente si hay elementos cargando
            const container = messagesContainerRef.current;
            container.scrollTo({
                top: container.scrollHeight,
                behavior
            });
            // Reintento rápido para asegurar posición final tras micro-ajustes de layout
            requestAnimationFrame(() => {
                container.scrollTo({ top: container.scrollHeight, behavior });
            });
        }
    };

    // Lógica para auto-seleccionar el mejor modelo disponible
    const autoSelectBestModel = (quotaData) => {
        if (!quotaData || hasManuallySelected.current) return;

        for (const m of AVAILABLE_MODELS) {
            const p = quotaData[m.provider];
            if (!p) continue;

            const usage = (p.modelUsage && p.modelUsage[m.model]) || 0;
            const limit = p.limitPerModel || 50;

            if (usage < limit) {
                console.log(`[AI] Auto-seleccionando mejor modelo disponible: ${m.name}`);
                setSelectedAI(m);
                break;
            }
        }
    };

    // Efecto 1: Manejo de apertura del modal y carga inicial
    useEffect(() => {
        if (isOpen) {
            if (isFirstOpen.current) {
                // Si el historial cargado es el de "historial limpiado",
                // lo cambiamos al de bienvenida ANTES de mostrarlo
                setChatHistory(prev => {
                    if (prev.length === 1 && prev[0].content === HISTORY_CLEARED_MESSAGE) {
                        return [{ id: 'welcome-' + Date.now(), role: 'assistant', content: '', fullContent: WELCOME_MESSAGE, isStreaming: true }];
                    }
                    return prev;
                });
                isFirstOpen.current = false;
            }
            fetchQuota();
        } else {
            // Cancelar peticiones activas al cerrar el modal
            handleAbort();
            isFirstOpen.current = true;
            hasManuallySelected.current = false;
        }
    }, [isOpen]);

    // Efecto nuevo: Auto-selección cuando llega la cuota
    useEffect(() => {
        if (quota && !hasManuallySelected.current) {
            autoSelectBestModel(quota);
        }
    }, [quota]);

    // OPTIMIZACIÓN DE PERSISTENCIA: Throttling de guardado en localStorage
    // Solo guardamos cuando el historial cambia, pero máximo una vez cada 2 segundos
    // o cuando el estado de streaming cambie.
    const lastSaveRef = useRef(0);
    useEffect(() => {
        const isStreamingNow = chatHistory.some(m => m?.isStreaming || (m?.fullContent && (m?.content?.length || 0) < m?.fullContent?.length));
        const now = Date.now();

        // Si no estamos streameando, guardamos inmediatamente.
        // Si estamos streameando, esperamos al menos 2 segundos entre guardados.
        if (!isStreamingNow || (now - lastSaveRef.current > 2000)) {
            const historyToSave = chatHistory.slice(-50).map(({ isStreaming, fullContent, ...msg }) => msg);
            localStorage.setItem('ai_chat_history', JSON.stringify(historyToSave));
            lastSaveRef.current = now;
        }

        // Si el historial crece mucho en memoria (> 60), lo truncamos para evitar fugas.
        if (chatHistory.length > 60) {
            setChatHistory(prev => prev.slice(-50));
        }
    }, [chatHistory]);

    // OPTIMIZACIÓN DE SCROLL: Separado para no bloquear
    useEffect(() => {
        if (isOpen && chatHistory.length > 0) {
            // Solo hacer scroll suave si es un mensaje nuevo o el final de la respuesta
            // Si se está escribiendo (streaming), usar scroll 'auto' (instentáneo) para ahorrar recursos
            const lastMsg = chatHistory[chatHistory.length - 1];
            if (!lastMsg) return;
            const isTyping = lastMsg.fullContent && (lastMsg.content?.length || 0) < lastMsg.fullContent.length;

            if (isTyping) {
                // Throttle visual: Scroll cada cierto tiempo o instantáneo
                scrollToBottom("auto");
            } else {
                scrollToBottom("smooth");
            }
        }
    }, [chatHistory, isOpen]);

    // Efecto 3: Animación de Escritura Suave (Typing Effect)
    // Este efecto persigue al 'fullContent' recibido por el stream para hacerlo más fluido
    useEffect(() => {
        // Buscamos cualquier mensaje que aún no haya terminado de escribirse
        const typingMsgIndex = chatHistory.findIndex(m => m.fullContent && (m.content?.length || 0) < m.fullContent.length);
        if (typingMsgIndex === -1) return;

        const typingMsg = chatHistory[typingMsgIndex];
        const isSystemMessage = typingMsg?.isSystem;

        // Si el contenido visible es menor al total recibido, lo aumentamos progresivamente
        if (typingMsg?.fullContent && (typingMsg?.content?.length || 0) < typingMsg.fullContent.length) {
            const timer = setTimeout(() => {
                setChatHistory(prev => {
                    if (!prev || prev.length === 0) return prev;
                    const next = [...prev];
                    const m = next[typingMsgIndex];
                    if (!m || !m.fullContent || (m.content?.length || 0) >= m.fullContent.length) return prev;

                    // Avanzar caracteres con velocidad balanceada
                    const diff = m.fullContent.length - (m.content?.length || 0);

                    let increment;
                    if (isSystemMessage) {
                        increment = 3;
                    } else {
                        increment = diff > 100 ? 12 : (diff > 20 ? 5 : 1);
                    }

                    next[typingMsgIndex] = {
                        ...m,
                        content: m.fullContent.slice(0, (m.content?.length || 0) + increment)
                    };
                    return next;
                });
            }, isSystemMessage ? 20 : 60);
            return () => clearTimeout(timer);
        }
    }, [chatHistory]);

    // Efecto para quitar el cursor de los mensajes del sistema tras 4 segundos de finalizar
    // Y OPTIMIZACIÓN: Limpiar 'fullContent' cuando ya no es necesario (animación terminada)
    useEffect(() => {
        const finishedMsgIndex = chatHistory.findIndex(m =>
            m?.fullContent &&
            (m?.content?.length || 0) >= m.fullContent.length
        );

        if (finishedMsgIndex !== -1) {
            const timer = setTimeout(() => {
                setChatHistory(prev => {
                    const next = [...prev];
                    const m = next?.[finishedMsgIndex];
                    if (!m || !m.fullContent || (m.content?.length || 0) < m.fullContent.length) return prev;

                    // Marcamos como no streaming y LIMPIAMOS fullContent para liberar RAM
                    // (Ya no es necesario porque content ya tiene el texto completo)
                    next[finishedMsgIndex] = {
                        ...m,
                        isStreaming: false,
                        fullContent: null // Liberar buffer pesado
                    };
                    return next;
                });
            }, 2000); // Reducido de 4000 a 2000 para liberar RAM antes
            return () => clearTimeout(timer);
        }
    }, [chatHistory]);

    // Efecto para verificar si se debe mostrar el botón de scroll al cambiar el historial
    useEffect(() => {
        if (!isOpen) {
            setShowScrollBottomBtn(false);
            return;
        }

        // Pequeño delay para dejar que el layout se asiente
        const timer = setTimeout(() => {
            if (messagesContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                const canScroll = scrollHeight > clientHeight + 100;
                const isFarFromBottom = canScroll && (scrollHeight - scrollTop - clientHeight > 400);
                setShowScrollBottomBtn(isFarFromBottom);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [chatHistory, isOpen]);
    // Las más antiguas se "hibernarán" para liberar la GPU, pero mantendrán su tamaño en el scroll.
    const visualIndices = React.useMemo(() => {
        const indices = [];
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            const msg = chatHistory[i];
            const content = msg?.content || '';
            const isVisual = msg?.role === 'assistant' && (
                content.includes('"chartType"') ||
                content.includes('"diagramType"') ||
                content.includes('"graph"') ||
                content.includes('```mermaid')
            );
            if (isVisual) {
                indices.push(i);
                if (indices.length >= 7) break; // Mantener 10 visuales activos
            }
        }
        return indices;
    }, [chatHistory]);

    const abortControllerRef = useRef(null);

    // Efecto de limpieza para cancelar peticiones pendientes al desmontar
    // Efecto de limpieza para cancelar peticiones pendientes al desmontar
    useEffect(() => {
        return () => {
            // Cancelar la petición si el componente se desmonta para evitar fugas de memoria
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleAbort = () => {
        if (abortControllerRef.current) {
            console.log("[AI] Abortando petición...");
            abortControllerRef.current.abort();
            // No seteamos a null aquí para dejar que el 'finally' de handleSend lo haga
            // y para que el 'catch' sepa que fue un aborto intencional.
        } else {
            // Si no hay controlador activo pero seguimos en streaming (ej: animación),
            // simplemente forzamos el fin del streaming en la UI
            setChatHistory(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === 'assistant' && (last.isStreaming || (last.content?.length || 0) < (last.fullContent?.length || 0))) {
                    return next.map((m, i) => i === next.length - 1 ? { ...m, isStreaming: false, content: m.fullContent || m.content } : m);
                }
                return prev;
            });
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!message.trim() || isLoading) return;

        // Cancelar petición anterior si existiera
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Crear nuevo controlador
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const userMessage = { id: 'user-' + Date.now(), role: 'user', content: message };
        setChatHistory(prev => [...prev, userMessage]);
        const currentMessage = message;
        setMessage('');
        setIsLoading(true);

        try {
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
            const token = userStr ? JSON.parse(userStr).token : '';

            const response = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: currentMessage,
                    history: chatHistory.slice(-10),
                    selectedModel: selectedAI.model,
                    selectedProvider: selectedAI.provider
                }),
                signal // Vincular señal de cancelación
            });


            if (!response.ok) {
                const data = await response.json().catch(() => ({ text: 'Error inesperado.' }));
                setChatHistory(prev => [...prev, { id: 'err-' + Date.now(), role: 'assistant', content: data.text || 'Error en la comunicación.' }]);
                setIsLoading(false);
                return;
            }

            // OBTENER MODELO REAL (Por si hubo fallback en el backend)
            const realModel = response.headers.get('X-Selected-Model');
            const realProvider = response.headers.get('X-Selected-Provider');
            let activeModel = selectedAI;

            if (realModel && realProvider && (realModel !== selectedAI.model || realProvider !== selectedAI.provider)) {
                const found = AVAILABLE_MODELS.find(m => m.model === realModel && m.provider === realProvider);
                if (found) {
                    // Si el modelo real es distinto al seleccionado por el usuario, mostramos el aviso
                    setFallbackMessage({
                        from: selectedAI.name,
                        to: found.name,
                        reason: "no dio respuesta"
                    });

                    // Auto-ocultar el mensaje después de 8 segundos
                    setTimeout(() => setFallbackMessage(null), 3000);

                    activeModel = found;
                    setSelectedAI(found);
                }
            }

            // Procesamiento del STREAM
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";
            let isFirstChunk = true;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;

                if (isFirstChunk) {
                    setIsLoading(false); // Quitamos el "Pensando..."
                    setChatHistory(prev => [...prev, {
                        id: 'ai-' + Date.now(),
                        role: 'assistant',
                        content: '', // Lo que se muestra al usuario gradualmente
                        fullContent: accumulatedText, // El buffer total recibido
                        isStreaming: true,
                        modelInfo: { name: activeModel.name, icon: activeModel.icon }
                    }]);
                    isFirstChunk = false;
                } else {
                    setChatHistory(prev => {
                        const newHistory = [...prev];
                        const lastMsgIndex = newHistory.length - 1;
                        if (newHistory[lastMsgIndex]?.role === 'assistant') {
                            newHistory[lastMsgIndex] = {
                                ...newHistory[lastMsgIndex],
                                fullContent: accumulatedText
                            };
                        }
                        return newHistory;
                    });
                }
            }

            // Al finalizar el stream, marcamos como completado la recepción de datos,
            // pero NO forzamos el contenido final para que la animación de escritura termine suavemente
            setChatHistory(prev => {
                const newHistory = [...prev];
                const lastMsgIndex = newHistory.length - 1;
                if (newHistory[lastMsgIndex]?.role === 'assistant') {
                    newHistory[lastMsgIndex] = {
                        ...newHistory[lastMsgIndex],
                        fullContent: accumulatedText,
                        isStreaming: false
                    };
                }
                return newHistory;
            });

            fetchQuota();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[AI] Petición cancelada por el usuario.');
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    const lastMsgIndex = newHistory.length - 1;

                    // Si estábamos en isLoading, no había mensaje de asistente aún
                    if (newHistory[lastMsgIndex]?.role === 'user') {
                        return [...newHistory, {
                            role: 'assistant',
                            content: '❌ *(Petición cancelada por el usuario)*',
                            fullContent: '❌ *(Petición cancelada por el usuario)*',
                            isStreaming: false,
                            modelInfo: { name: selectedAI.name, icon: selectedAI.icon }
                        }];
                    }

                    // Si ya había mensaje de asistente (streaming)
                    if (newHistory[lastMsgIndex]?.role === 'assistant') {
                        newHistory[lastMsgIndex] = {
                            ...newHistory[lastMsgIndex],
                            content: (newHistory[lastMsgIndex].content || '') + '\n\n*(Respuesta interrumpida)*',
                            fullContent: (newHistory[lastMsgIndex].fullContent || '') + '\n\n*(Respuesta interrumpida)*',
                            isStreaming: false
                        };
                    }
                    return newHistory;
                });
            } else {
                console.error("Chat error:", error);
                setChatHistory(prev => [...prev, { role: 'assistant', content: 'No pude conectarme con el servidor. Verifica tu conexión.' }]);
            }
            setIsLoading(false);
            fetchQuota();
        } finally {
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    };

    const clearHistory = () => {
        const initialMessage = {
            role: 'assistant',
            content: '',
            fullContent: HISTORY_CLEARED_MESSAGE,
            isStreaming: true,
            isSystem: true
        };
        setChatHistory([initialMessage]);
        setShowScrollBottomBtn(false); // Resetear botón al limpiar
    };

    const handleEditMessage = (index, content) => {
        setMessage(content);
        setChatHistory(prev => prev.slice(0, index));
    };

    // Helper para saber si se está generando respuesta (Cargando o Escribiendo / Animando)
    const isGenerating = isLoading || (chatHistory.length > 0 && (
        chatHistory[chatHistory.length - 1].isStreaming ||
        (chatHistory[chatHistory.length - 1].fullContent && (chatHistory[chatHistory.length - 1].content?.length || 0) < (chatHistory[chatHistory.length - 1].fullContent?.length || 0))
    ) && !chatHistory[chatHistory.length - 1].isSystem);

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            TransitionComponent={Transition}
            TransitionProps={{
                onEntered: () => {
                    setIsBlurActive(true);
                    // Bajamos suavemente al final después de que el modal se abre
                    setTimeout(() => scrollToBottom("smooth"), 150);
                },
                onExit: () => {
                    setIsBlurActive(false);
                }
            }}
            transitionDuration={350}
            PaperProps={{
                className: "ai-chat-window centered",
                elevation: 10,
                onClick: (e) => e.stopPropagation()
            }}
            slotProps={{
                backdrop: {
                    className: `ai-assistant-overlay ${isBlurActive ? 'backdrop-blur-active' : ''}`
                }
            }}
            maxWidth={false}
        >
            <Box className="ai-chat-header">
                <Box
                    className={`ai-header-title-pill ${showQuota ? 'expanded' : ''}`}
                    onClick={() => setShowQuota(!showQuota)}
                    sx={{ cursor: 'pointer' }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <div className="ai-header-bot-icon" />
                        <Typography
                            variant="body2"
                            fontWeight="bold"
                            sx={{
                                ml: 1,
                                background: 'linear-gradient(to top right, #b60000 30%, #750800 60%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                display: 'inline-block'
                            }}
                        >
                            Asistente IA
                        </Typography>
                    </Box>

                    {quota && Object.keys(quota).map((providerKey) => {
                        const p = quota[providerKey];
                        if (p.limit === 0 && p.used === 0) return null; // No mostrar si no hay llaves ni uso

                        return (
                            <Box key={providerKey} className="ai-quota-collapsible-wrapper">
                                <Box className="ai-quota-items-list">
                                    <Tooltip
                                        title={
                                            <Box sx={{ p: 0.5 }}>
                                                <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>
                                                    {p.name}
                                                </Typography>
                                                {p.modelUsage && Object.entries(p.modelUsage).map(([model, count]) => (
                                                    <Box key={model} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.2 }}>
                                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>{model}</Typography>
                                                        <Typography variant="caption" fontWeight="bold">{count}/{p.limitPerModel}</Typography>
                                                    </Box>
                                                ))}
                                                {(!p.modelUsage || Object.keys(p.modelUsage).length === 0) && (
                                                    <Typography variant="caption" fontStyle="italic">Sin uso registrado hoy</Typography>
                                                )}
                                            </Box>
                                        }
                                        arrow
                                        placement={isMobile ? "bottom" : "left"}
                                        PopperProps={{ sx: { zIndex: 2500 } }}
                                    >
                                        <Box className={`ai-quota-item ${providerKey}`}>
                                            {providerKey === 'google' ? (
                                                <div className="logo-gemini ai-quota-icon" />
                                            ) : providerKey === 'groq' ? (
                                                <div className="logo-groq ai-quota-icon" />
                                            ) : providerKey === 'openrouter' ? (
                                                <div className="logo-openrouter ai-quota-icon" />
                                            ) : (
                                                <Whatshot className="ai-quota-icon" />
                                            )}
                                            <Box className="ai-quota-bar-wrapper">
                                                <Box
                                                    className="ai-quota-bar-fill"
                                                    style={{
                                                        width: `${p.used > 0 ? Math.max(2, (p.used / p.limit) * 100) : 0}%`
                                                    }}
                                                />
                                            </Box>
                                            <Typography className="ai-quota-text">
                                                {p.limit > 0
                                                    ? (p.used > 0 && Math.round((p.used / p.limit) * 100) === 0 ? `<1% (${p.used})` : Math.round((p.used / p.limit) * 100) + '%')
                                                    : '0%'}
                                            </Typography>
                                        </Box>
                                    </Tooltip>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>

                <Box className="ai-header-actions">
                    <Tooltip title="Limpiar historial" PopperProps={{ sx: { zIndex: 2500 } }}>
                        <IconButton className="ai-header-glass-btn" onClick={clearHistory}>
                            <DeleteSweep sx={{ color: 'black' }} />
                        </IconButton>
                    </Tooltip>
                    <IconButton className="ai-header-glass-btn" onClick={onClose}>
                        <Close sx={{ color: 'black' }} />
                    </IconButton>
                </Box>
            </Box>

            <DialogContent
                className="ai-messages-container"
                sx={{ p: '20px', position: 'relative' }}
                onScroll={handleScroll}
                ref={messagesContainerRef}
            >
                {chatHistory.map((msg, index) => (
                    <MessageBubble
                        key={msg.id || index}
                        msg={msg}
                        index={index}
                        visualIndices={visualIndices}
                        markdownComponents={markdownComponents}
                        streamingComponents={streamingComponents}
                        WELCOME_MESSAGE={WELCOME_MESSAGE}
                        HISTORY_CLEARED_MESSAGE={HISTORY_CLEARED_MESSAGE}
                        handleEditMessage={handleEditMessage}
                        isExporting={isExporting}
                        setIsExporting={setIsExporting}
                    />
                ))}
                {isLoading && (
                    <Box className="ai-message-wrapper assistant">
                        <Box className="ai-message-bubble assistant loading">
                            <CircularProgress size={16} color="inherit" />
                            <span style={{ marginLeft: '10px' }}>Pensando...</span>
                        </Box>
                    </Box>
                )}
                <div ref={messagesEndRef} />
            </DialogContent>

            {/* Botón flotante para bajar al final - FUERA de DialogContent para que sea FIJO */}
            <Zoom in={showScrollBottomBtn}>
                <Fab
                    size="small"
                    className="ai-scroll-bottom-btn"
                    onClick={() => scrollToBottom("smooth")}
                    aria-label="Ir al final"
                >
                    <KeyboardArrowDown />
                </Fab>
            </Zoom>

            <Box className="ai-input-area">
                {/* Mensaje de Fallback (Aviso de cambio de modelo) */}
                <Zoom in={Boolean(fallbackMessage)}>
                    <Box className="ai-fallback-notification">
                        <Whatshot sx={{ fontSize: 14, mr: 0.5, color: '#ff9800' }} />
                        <Typography variant="caption">
                            <strong>{fallbackMessage?.from}</strong> {fallbackMessage?.reason}, cambiando a <strong>{fallbackMessage?.to}</strong>
                        </Typography>
                        <IconButton size="small" onClick={() => setFallbackMessage(null)} sx={{ ml: 1, p: 0.2 }}>
                            <Close sx={{ fontSize: 12 }} />
                        </IconButton>
                    </Box>
                </Zoom>

                {/* Selector de Modelo */}
                <Box className={`ai-model-selector-container ${showModelSelector ? 'visible' : ''}`}>
                    <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 'bold', color: '#666' }}>
                        Modelos IA disponibles
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {AVAILABLE_MODELS.map((m) => {
                            const p = quota?.[m.provider];
                            const usage = (p?.modelUsage && p.modelUsage[m.model]) || 0;
                            const limit = p?.limitPerModel || 50;
                            const isExhausted = p && usage >= limit;

                            return (
                                <Box
                                    key={m.model}
                                    className={`ai-model-pill ${selectedAI.model === m.model ? 'active' : ''} ${isExhausted ? 'exhausted' : ''}`}
                                    onClick={() => {
                                        if (isExhausted) return;
                                        setSelectedAI(m);
                                        hasManuallySelected.current = true;
                                        setShowModelSelector(false);
                                    }}
                                    sx={{
                                        opacity: isExhausted ? 0.5 : 1,
                                        cursor: isExhausted ? 'not-allowed' : 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    <div className={`logo-${m.icon} ai-quota-icon`} style={{ width: 14, height: 14 }} />
                                    {m.name}
                                    {isExhausted && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: '0.6rem',
                                                position: 'absolute',
                                                bottom: -12,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                color: '#d32f2f',
                                                fontWeight: 'bold',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Agotado
                                        </Typography>
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder={`Pregunta a ${selectedAI.name}...`}
                    size="small"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    autoComplete="off"
                    autoFocus
                    sx={{
                        '& .MuiInputBase-input': { fontSize: isMobile ? '0.85rem' : '1rem' },
                        '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'white' }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconButton
                                    size="small"
                                    onClick={() => setShowModelSelector(!showModelSelector)}
                                    sx={{
                                        transition: 'all 0.3s ease',
                                        transform: showModelSelector ? 'rotate(180deg)' : 'none',
                                        padding: '4px'
                                    }}
                                >
                                    <div
                                        className={`logo-${selectedAI.icon} ai-quota-icon`}
                                        style={{
                                            width: 20,
                                            height: 20,
                                            filter: showModelSelector ? 'drop-shadow(0 0 2px rgba(138, 16, 16, 0.5))' : 'none'
                                        }}
                                    />
                                </IconButton>
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                {isGenerating ? (
                                    <Tooltip title="Detener respuesta">
                                        <IconButton
                                            onClick={handleAbort}
                                            sx={{ color: '#8a1010' }}
                                        >
                                            <Stop />
                                        </IconButton>
                                    </Tooltip>
                                ) : (
                                    <IconButton
                                        onClick={handleSend}
                                        disabled={!message.trim()}
                                        sx={{ color: '#8a1010' }}
                                    >
                                        <Send />
                                    </IconButton>
                                )}
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>
        </Dialog>
    );
};

export default Assistant;
