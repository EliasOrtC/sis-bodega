import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingOverlay = ({ message = 'Procesando...' }) => {
    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'inherit',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            }}
        >
            <CircularProgress color="primary" size={50} thickness={4} />
            <Typography
                variant="body1"
                sx={{
                    marginTop: 2,
                    fontWeight: 600,
                    color: 'text.secondary',
                    animation: 'pulse 1.5s infinite ease-in-out'
                }}
            >
                {message}
            </Typography>
            <style>
                {`
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}
            </style>
        </Box>
    );
};

export default LoadingOverlay;
