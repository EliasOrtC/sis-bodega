import React from 'react';
import LaunchIcon from '@mui/icons-material/Launch';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Typography, Grid } from '@mui/material';
import ScrollStack, { ScrollStackItem } from '../components/common/ScrollStack';
import '../styles/Bienvenida.css';

const modulesData = [
  {
    title: 'Análisis de Datos',
    subtitle: 'Control Estadístico del sistema',
    description: 'Estos gráficos están implementados para facilitar decisiones basadas en datos, mejorar la rentabilidad, reducir riesgos operativos y potenciar el crecimiento del negocio mediante visualizaciones claras e interactivas.',
    buttonText: 'Ver gráficos',
    link: '/graficos',
    image: '/DE.webp',
    contentClass: 'DatosEstadisticos'
  },
  {
    title: 'Módulo de Ventas',
    subtitle: 'Registros de ventas',
    description: 'Este módulo permite registrar de forma rápida y precisa las ventas de productos, actualizar automáticamente el stock en tiempo real, aplicar descuentos, generar facturas y realizar devoluciones. Su función principal es agilizar el proceso de salida de mercancía y mejorar la eficiencia operativa.',
    buttonText: 'Ir a Ventas',
    link: '/ventas',
    image: '/MV.webp',
    contentClass: 'ModuloVentas'
  },
  {
    title: 'Módulo de Compras',
    subtitle: 'Registros de compras',
    description: 'Este módulo permite registrar de forma rápida y precisa las compras de productos, actualizar automáticamente el stock en tiempo real, aplicar descuentos, generar facturas y realizar devoluciones. Su función principal es agilizar el proceso de entrada de mercancía y mejorar la eficiencia operativa.',
    buttonText: 'Ir a Compras',
    link: '/compras',
    image: '/MC.webp',
    contentClass: 'ModuloCompras'
  },
  {
    title: 'Módulo de Clientes',
    subtitle: 'Registros de clientes',
    description: 'Este módulo permite registrar y gestionar la información de todos los clientes de forma sencilla. Su función principal es almacenar datos como el historial de ventas y crédito disponible, facilitar la búsqueda rápida al momento de vender, asignar descuentos personalizados y mantener un registro actualizado de deudas o pagos pendientes.',
    buttonText: 'Ir a Clientes',
    link: '/clientes',
    image: '/MCL.webp',
    contentClass: 'ModuloClientes'
  },
  {
    title: 'Módulo de Empleados',
    subtitle: 'Registros de Empleados',
    description: 'Este módulo permite registrar y administrar la información de todo tu personal de manera organizada. Su función principal es almacenar datos como informacion personal, horario, salario, fecha de ingreso y permisos de acceso al sistema, facilitar el control de asistencia, asignar roles específicos (por ejemplo, solo ventas o administrador completo) y generar reportes de actividad.',
    buttonText: 'Ir a Empleados',
    link: '/empleados',
    image: '/EMP.webp',
    contentClass: 'ModuloEmpleados'
  },
  {
    title: 'Módulo de Inventario',
    subtitle: 'Control del inventario',
    description: 'Este módulo de inventario es el núcleo de un sistema para bodega, ya que mantiene un control preciso y en tiempo real de todos los productos. Esto facilita evitar quiebres o excesos de stock, reducir pérdidas, tomar decisiones de compra informadas y ahorrar tiempo al eliminar conteos manuales constantes.',
    buttonText: 'Ir a Inventario',
    link: '/inventario',
    image: '/INV.webp',
    contentClass: 'ModuloInventario'
  }
];

const BienvenidaCard = ({ data }) => {
  const { title, subtitle, description, buttonText, link, image, contentClass } = data;
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (link) {
      console.log('Navegando a:', link);
      navigate(link);
    }
  };

  const animationDelay = `${data.index * 0.15}s`;

  return (
    <ScrollStackItem>
      <div
        className="reveal-up"
        style={{ animationDelay, width: '100%', height: '100%' }}
      >
        <Card
          sx={{ width: '100%', height: '100%', cursor: link ? 'pointer' : 'default' }}
          className='tarjeta bienvenida'
          onClick={handleCardClick}
        >
          <CardContent className={`tarjeta-contenido ${contentClass}`}>
            <div className='div-contenedor-tarjetas'>
              <div className='texto-tarjetasBV'>
                <Typography variant="h3">{title}</Typography>
                <Typography variant="h5" sx={{ mt: 2 }}>{subtitle}</Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>{description}</Typography>

                <Button
                  className='boton-tarjetasBV'
                  variant="contained"
                  color="primary"
                  endIcon={<LaunchIcon />}
                >
                  {buttonText}
                </Button>
              </div>
              <div className='img-tarjetasBV'>
                <img src={image} alt="" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollStackItem>
  );
};

const Bienvenida = () => {
  const navigate = useNavigate();
  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <ScrollStack>
        <Grid item xs={12}>
          {modulesData.map((data, index) => (
            <BienvenidaCard key={index} data={{ ...data, index }} />
          ))}
        </Grid>
      </ScrollStack>
    </Grid>
  );
};

export default Bienvenida;