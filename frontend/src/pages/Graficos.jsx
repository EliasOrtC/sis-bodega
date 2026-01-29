import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, Box, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/config';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend, ComposedChart, Area
} from 'recharts';
import '../styles/Graficos.css';

const Graficos = () => {
    const navigate = useNavigate();
    const [ventasMensuales, setVentasMensuales] = useState([]);
    const [productosEstrella, setProductosEstrella] = useState([]);
    const [rendimientoEmpleados, setRendimientoEmpleados] = useState([]);
    const [nivelesStock, setNivelesStock] = useState([]);
    const [ticketPromedio, setTicketPromedio] = useState([]);
    const [ventasSemanales, setVentasSemanales] = useState([]);
    const [distribucionPrecios, setDistribucionPrecios] = useState([]);
    const [bajaRotacion, setBajaRotacion] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
            const token = user?.token;

            // Usar la URL centralizada de la API
            const API_BASE = `${API_BASE_URL}/stats`;

            const fetchOptions = {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };

            const fetchWithAuth = async (endpoint) => {
                const res = await fetch(endpoint, fetchOptions);
                if (res.status === 401 || res.status === 403) {
                    window.dispatchEvent(new CustomEvent('sessionExpired'));
                    throw new Error('Sesión expirada');
                }
                return res.json();
            };

            try {
                const [vMensuales, pEstrella, rEmpleados, nStock, tPromedio, vSemanales, dPrecios, bRotacion] = await Promise.all([
                    fetchWithAuth(`${API_BASE}/ventas-mensuales`),
                    fetchWithAuth(`${API_BASE}/productos-estrella`),
                    fetchWithAuth(`${API_BASE}/rendimiento-empleados`),
                    fetchWithAuth(`${API_BASE}/niveles-stock`),
                    fetchWithAuth(`${API_BASE}/ticket-promedio`),
                    fetchWithAuth(`${API_BASE}/ventas-semanales`),
                    fetchWithAuth(`${API_BASE}/distribucion-precios`),
                    fetchWithAuth(`${API_BASE}/baja-rotacion`)
                ]);
                setVentasMensuales(vMensuales.sort((a, b) => a.mes.localeCompare(b.mes)));
                setProductosEstrella(pEstrella);
                setRendimientoEmpleados(rEmpleados);
                setNivelesStock(nStock);
                setTicketPromedio(tPromedio.sort((a, b) => a.mes.localeCompare(b.mes)));
                setVentasSemanales(vSemanales);
                setDistribucionPrecios(dPrecios);
                setBajaRotacion(bRotacion);
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
                    {/* === SECCIÓN: ANÁLISIS DE VENTAS === */}
                    {/* Tendencia de Ventas Mensuales */}
                    <Grid item size={{ xs: 12, lg: 6 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 250 }}>
                            <Typography variant="h6" className="chart-title">Tendencia de Ventas Mensuales</Typography>
                            <Box sx={{ height: 200, width: '100%', mt: 2 }}>
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

                    {/* Ticket Promedio Mensual */}
                    <Grid item size={{ xs: 12, lg: 6 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 250 }}>
                            <Typography variant="h6" className="chart-title">Promedio de Venta por Cliente</Typography>
                            <Box sx={{ height: 200, width: '100%', mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={ticketPromedio}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis dataKey="mes" stroke="#ccc" />
                                        <YAxis stroke="#ccc" />
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value) => `C$ ${Number(value).toFixed(2)}`} />
                                        <Area type="monotone" dataKey="promedio" fill="#8884d8" stroke="#8884d8" strokeWidth={3} fillOpacity={0.2} isAnimationActive={false} />
                                        <Bar dataKey="promedio" barSize={20} fill="#413ea0" isAnimationActive={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Ventas Semanales */}
                    <Grid item size={{ xs: 12, lg: 6 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 250 }}>
                            <Typography variant="h6" className="chart-title">Patrón Semanal de Ventas (Intensidad)</Typography>
                            <Box sx={{ height: 200, width: '100%', mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ventasSemanales}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                                        <XAxis dataKey="dia" stroke="#ccc" />
                                        <YAxis stroke="#ccc" />
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value) => `C$ ${value}`} />
                                        <Bar dataKey="total" fill="#ff7300" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                                            {ventasSemanales.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={`rgba(255, 115, 0, ${0.4 + (index * 0.1)})`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Distribución por Rango de Venta */}
                    <Grid item size={{ xs: 12, lg: 6 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 250 }}>
                            <Typography variant="h6" className="chart-title">Distribución por Rango de Venta</Typography>
                            <Box sx={{ height: 200, width: '100%', mt: 2 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={distribucionPrecios} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                                        <XAxis type="number" stroke="#ccc" />
                                        <YAxis dataKey="rango" type="category" stroke="#ccc" width={100} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                        <Bar dataKey="cantidad" fill="#82ca9d" radius={[0, 5, 5, 0]} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* === SECCIÓN: PRODUCTOS Y EMPLEADOS === */}
                    {/* Top Productos Estrella */}
                    <Grid item size={{ xs: 12, lg: 4 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 250 }}>
                            <Typography variant="h6" className="chart-title">Top 5 Productos Estrella</Typography>
                            <Box sx={{ height: 200, width: '100%', mt: 2 }}>
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

                    {/* Rendimiento de Empleados */}
                    <Grid item size={{ xs: 12, lg: 4 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 250 }}>
                            <Typography variant="h6" className="chart-title">Rendimiento por Empleado</Typography>
                            <Box sx={{ height: 200, width: '100%', mt: 2 }}>
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

                    {/* Productos de Baja Rotación */}
                    <Grid item size={{ xs: 12, lg: 4 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 250, overflow: 'hidden' }}>
                            <Typography variant="h6" className="chart-title" sx={{ color: '#ff5252' }}>⚠️ Baja Rotación (+15 días)</Typography>
                            <Box sx={{ height: 200, width: '100%', mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {bajaRotacion.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={bajaRotacion} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                                            <XAxis type="number" stroke="#ccc" />
                                            <YAxis dataKey="nombre" type="category" stroke="#ccc" width={120} tick={{ fontSize: 12 }} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                            <Bar dataKey="stock" fill="#ef5350" name="Stock Estancado" radius={[0, 5, 5, 0]} isAnimationActive={false} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <Typography variant="body1" sx={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', px: 4 }}>
                                        ¡Excelente! No hay productos estancados.<br />
                                        Todos los productos con stock han tenido ventas en los últimos 15 días.
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* === SECCIÓN: INVENTARIO === */}
                    {/* Distribución de Stock */}
                    <Grid item size={{ xs: 12 }}>
                        <Paper className="chart-paper" sx={{ minHeight: 300 }}>
                            <Typography variant="h6" className="chart-title">Distribución de Stock en Almacén</Typography>
                            <Box sx={{ height: 250, width: '100%', mt: 2 }}>
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
