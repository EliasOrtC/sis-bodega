import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import HistorialAcciones from '../components/config/HistorialAcciones.jsx';
import '../styles/Configuracion.css';

const Configuracion = () => {
    const [activeTab, setActiveTab] = useState('historial');

    const menuItems = [
        { id: 'historial', label: 'Historial de Acciones', icon: <HistoryIcon /> },
        // Puedes agregar más pestañas aquí en el futuro
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'historial':
                return <HistorialAcciones />;
            default:
                return (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6">Seleccione una opción del menú</Typography>
                    </Box>
                );
        }
    };

    return (
        <Box className="configuracion-container">
            <Box className="config-sidebar">
                <Box sx={{ px: 3, mb: 4, mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon sx={{ color: 'white' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                        Configuración
                    </Typography>
                </Box>
                {menuItems.map((item) => (
                    <Box
                        key={item.id}
                        className={`config-sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.id)}
                    >
                        {item.icon}
                        <Typography variant="body1">{item.label}</Typography>
                    </Box>
                ))}
            </Box>
            <Box className="config-content">
                <Box className="config-card">
                    {renderContent()}
                </Box>
            </Box>
        </Box>
    );
};

export default Configuracion;
