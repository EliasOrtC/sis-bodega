import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, Box, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/config';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import '../styles/Graficos.css';

const Graficos = () => {
    const navigate = useNavigate();
    const [ventasMensuales, setVentasMensuales] = useState([]);
    const [productosEstrella, setProductosEstrella] = useState([]);
    const [rendimientoEmpleados, setRendimientoEmpleados] = useState([]);
    const [nivelesStock, setNivelesStock] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
            const token = user?.token;

            // Usar la URL centralizada de la API
            const API_BASE = `${import.meta.env?.VITE_API_URL || API_BASE_URL}/stats`;

            const fetchOptions = {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };

            try {
                const [vMensuales, pEstrella, rEmpleados, nStock] = await Promise.all([
                    fetch(`${API_BASE}/ventas-mensuales`, fetchOptions).then(res => res.json()),
                    fetch(`${API_BASE}/productos-estrella`, fetchOptions).then(res => res.json()),
                    fetch(`${API_BASE}/rendimiento-empleados`, fetchOptions).then(res => res.json()),
                    fetch(`${API_BASE}/niveles-stock`, fetchOptions).then(res => res.json())
                ]);
                setVentasMensuales(vMensuales);
                setProductosEstrella(pEstrella);
                setRendimientoEmpleados(rEmpleados);
                setNivelesStock(nStock);
            } catch (error) {
                console.error('Error al cargar datos estadísticos:', error);
            }
        };
        fetchData();
    }, []);

    const COLORS = ['#D32F2F', '#1976D2', '#388E3C', '#7B1FA2', '#FBC02D', '#0097A7'];

    return (
        <Box className="graficos-root">
            <Container maxWidth="xl" className="graficos-container">
                <Box display="flex" alignItems="center" mb={4}>
                    <Tooltip title="Regresar al Sistema">
                        <IconButton onClick={() => navigate('/')} className="back-button">
                            <ArrowBackIcon sx={{ color: 'white', fontSize: '2rem' }} />
                        </IconButton>
                    </Tooltip>
                    <Typography variant="h2" className="dashboard-title" sx={{ ml: 2, fontWeight: 'bold' }}>
                        Panel de Análisis de Datos
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {/* Tendencia de Ventas (Line Chart) */}
                    <Grid item size={{ xs: 12, lg: 8 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 400 }}>
                            <Typography variant="h6" className="chart-title">Tendencia de Ventas Mensuales</Typography>
                            <Box sx={{ height: 350, width: '100%', mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={ventasMensuales}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis dataKey="mes" stroke="#ccc" />
                                        <YAxis stroke="#ccc" tickFormatter={(value) => `C$ ${value}`} tick={{ fontSize: 12 }} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ fontSize: '13px' }}
                                            formatter={(value) => `C$ ${value}`}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#1976D2"
                                            strokeWidth={4}
                                            dot={{ r: 6, fill: '#1976D2' }}
                                            activeDot={{ r: 8 }}
                                            isAnimationActive={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Top Productos (Bar Chart) */}
                    <Grid item size={{ xs: 12, lg: 4 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 400 }}>
                            <Typography variant="h6" className="chart-title">Top 5 Productos Estrella</Typography>
                            <Box sx={{ height: 350, width: '100%', mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={productosEstrella} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                                        <XAxis type="number" stroke="#ccc" />
                                        <YAxis dataKey="nombre" type="category" stroke="#ccc" width={100} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        />
                                        <Bar dataKey="cantidad" stroke="#ffffffff" fill="#ffffffff" radius={[0, 5, 5, 0]} isAnimationActive={false}>
                                            {productosEstrella.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Rendimiento de Empleados (Bar Chart Vertical) */}
                    <Grid item size={{ xs: 12, md: 6 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 400 }}>
                            <Typography variant="h6" className="chart-title">Rendimiento por Empleado (Ventas Totales)</Typography>
                            <Box sx={{ height: 350, width: '100%', mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={rendimientoEmpleados}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis dataKey="empleado" stroke="#ccc" />
                                        <YAxis stroke="#ccc" tickFormatter={(value) => `C$ ${value}`} tick={{ fontSize: 12 }} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ fontSize: '13px' }}
                                            formatter={(value) => `C$ ${value}`}
                                        />
                                        <Bar dataKey="total" isAnimationActive={false} stroke="#ffffffff" fill="#ffffffff" radius={[10, 10, 0, 0]}>
                                            {rendimientoEmpleados.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Niveles de Stock (Pie Chart o similar) */}
                    <Grid item size={{ xs: 12, md: 6 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 400 }}>
                            <Typography variant="h6" className="chart-title">Distribución de Stock en Almacén</Typography>
                            <Box sx={{ height: 350, width: '100%', mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={nivelesStock.slice(0, 8)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="stock"
                                            nameKey="nombre"
                                            label
                                            isAnimationActive={false}
                                        >
                                            {nivelesStock.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend verticalAlign="bottom" height={36} />
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default Graficos;
