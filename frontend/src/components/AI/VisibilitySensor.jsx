import React, { useState, useEffect, useRef } from 'react';

const VisibilitySensor = ({ children, minHeight = '150px', keepRendered = false, ...props }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Si keepRendered es true, una vez cargado no se desmonta (solo lazy load inicial)
                // Si es false (por defecto), se desmonta al salir de pantalla para ahorrar memoria
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    setHasLoaded(true);
                } else {
                    if (!keepRendered) {
                        setIsVisible(false);
                    }
                }
            },
            {
                rootMargin: '300px 0px', // Margen amplio para evitar "pop-in" visible
                threshold: 0
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [keepRendered]);

    return (
        <div
            ref={ref}
            style={{ minHeight, ...props.style, width: '100%', transition: 'opacity 0.3s ease' }}
            className={props.className}
        >
            {isVisible || (keepRendered && hasLoaded) ? (
                children
            ) : (
                <div style={{
                    height: minHeight,
                    width: '100%',
                    borderRadius: '16px',
                    background: 'linear-gradient(90deg, #f5f5f5 0%, #ffffff 50%, #f5f5f5 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'placeholderShimmer 2s infinite linear',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.5
                }}>
                    {/* Placeholder visual ligero */}
                </div>
            )}
        </div>
    );
};

export default VisibilitySensor;
