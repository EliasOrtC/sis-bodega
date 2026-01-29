import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { Typography, Box, CircularProgress } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import '../../styles/Modales.css';

const SUCCESS_GREEN = '#4bb71b';
const ERROR_RED = '#ff4d4d';

const SuccessIcon = () => (
    <div className="success-checkmark" style={{ width: '22px', height: '22px', marginBottom: 0 }}>
        <svg className="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{ width: '22px', height: '22px' }}>
            <circle className="check-circle" cx="26" cy="26" r="25" fill="none" style={{ strokeWidth: 4, stroke: SUCCESS_GREEN, filter: `drop-shadow(0 0 4px ${SUCCESS_GREEN}44)` }} />
            <path className="check-tick" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" style={{ strokeWidth: 4, stroke: SUCCESS_GREEN }} />
        </svg>
    </div>
);

const NotificationBox = ({ children, isError, status }) => {
    const innerRef = useRef(null);
    const [width, setWidth] = useState(300);

    useLayoutEffect(() => {
        if (innerRef.current) {
            const contentWidth = innerRef.current.offsetWidth;
            setWidth(Math.max(300, contentWidth + 48)); // Un poco más de padding
        }
    }, [children]);

    const getColors = () => {
        if (isError) return { color: ERROR_RED, bg: 'rgba(255, 235, 235, 0.85)', border: 'rgba(255, 77, 77, 0.3)' };
        if (status === 'loading') return { color: SUCCESS_GREEN, bg: 'rgba(255, 255, 255, 0.85)', border: 'rgba(75, 183, 27, 0.3)' };
        return { color: SUCCESS_GREEN, bg: 'rgba(240, 255, 240, 0.85)', border: 'rgba(75, 183, 27, 0.3)' };
    };

    const colors = getColors();

    return (
        <Box
            sx={{
                backgroundColor: colors.bg,
                backdropFilter: 'blur(4px) saturate(180%)',
                padding: '14px 24px',
                borderRadius: '16px',
                boxShadow: `
                    0 4px 6px -1px rgba(0, 0, 0, 0.1), 
                    0 10px 15px -3px rgba(0, 0, 0, 0.1),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.4),
                    0 0 20px ${colors.color}15
                `,
                border: `1px solid ${colors.border}`,
                width: `${width}px`,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                position: 'relative'
            }}
        >
            {/* Efecto de brillo sutil en el borde superior */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: '10%',
                right: '10%',
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${colors.color}44, transparent)`,
                width: 'max-content'
            }} />

            <Box
                ref={innerRef}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: 'max-content',
                    minWidth: '160px'
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

const AnimatedNotification = ({ show, children, isError, status }) => {
    const [render, setRender] = useState(show);
    const [isExiting, setIsExiting] = useState(false);
    const [displayContent, setDisplayContent] = useState(children);
    const [displayIsError, setDisplayIsError] = useState(isError);
    const [displayStatus, setDisplayStatus] = useState(status);

    useEffect(() => {
        if (show) {
            setRender(true);
            setIsExiting(false);
            setDisplayContent(children);
            setDisplayIsError(isError);
            setDisplayStatus(status);
        } else if (render && !isExiting) {
            setIsExiting(true);
            const timer = setTimeout(() => {
                setRender(false);
                setIsExiting(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [show, render, children, isError, status, isExiting]);

    if (!render) return null;

    return (
        <Box
            sx={{
                animation: isExiting
                    ? 'slideOutLeft 0.5s cubic-bezier(0.4, 0, 1, 1) forwards'
                    : 'slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                mb: 1.5,
                perspective: '1000px'
            }}
        >
            <NotificationBox isError={displayIsError} status={displayStatus}>
                {displayContent}
            </NotificationBox>
        </Box>
    );
};

const TableStatus = React.memo(({ loading, error, loadingMessage, errorMessage }) => {
    const [showOnline, setShowOnline] = useState(false);
    const [mainStatus, setMainStatus] = useState(null); // 'loading', 'success', 'error', 'online', null
    const prevError = useRef(error);
    const prevLoading = useRef(loading);

    // Manejo de recuperación de conexión (Online)
    useEffect(() => {
        if (prevError.current && !error) {
            setShowOnline(true);
            const timer = setTimeout(() => setShowOnline(false), 3000);
            return () => clearTimeout(timer);
        }
        prevError.current = error;
    }, [error]);

    // Lógica de estado principal unificada
    useEffect(() => {
        if (error) {
            setMainStatus('error');
        } else if (loading) {
            setMainStatus('loading');
        } else if (showOnline) {
            setMainStatus('online');
        } else if (prevLoading.current && !loading && !error) {
            setMainStatus('success');
            const timer = setTimeout(() => setMainStatus(null), 2500);
            return () => clearTimeout(timer);
        } else {
            setMainStatus(null);
        }
        prevLoading.current = loading;
    }, [loading, error, showOnline]);

    const getNotificationContent = () => {
        switch (mainStatus) {
            case 'loading':
                return (
                    <>
                        <CircularProgress size={20} sx={{ color: SUCCESS_GREEN }} />
                        <Typography variant="body2" sx={{ color: SUCCESS_GREEN, fontWeight: 700, fontSize: '0.95rem' }}>
                            {loadingMessage || 'Cargando datos...'}
                        </Typography>
                    </>
                );
            case 'success':
                return (
                    <>
                        <SuccessIcon />
                        <Typography variant="body2" sx={{ color: SUCCESS_GREEN, fontWeight: 700, fontSize: '0.95rem' }}>
                            Cargado correctamente
                        </Typography>
                    </>
                );
            case 'error':
                return (
                    <>
                        <ErrorOutlineIcon sx={{ color: '#d32f2f' }} />
                        <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 700, fontSize: '0.95rem' }}>
                            {errorMessage || `Error: ${error}`}
                        </Typography>
                    </>
                );
            case 'online':
                return (
                    <>
                        <SuccessIcon />
                        <Typography variant="body2" sx={{ color: SUCCESS_GREEN, fontWeight: 700, fontSize: '0.95rem' }}>
                            En línea de nuevo
                        </Typography>
                    </>
                );
            default:
                return null;
        }
    };

    return ReactDOM.createPortal(
        <Box
            className="status-notification-container"
            sx={{
                position: 'fixed',
                top: '70px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                pointerEvents: 'none'
            }}
        >
            <AnimatedNotification
                show={mainStatus !== null}
                isError={mainStatus === 'error'}
            >
                {getNotificationContent()}
            </AnimatedNotification>
        </Box>,
        document.body
    );
});

export default TableStatus;
