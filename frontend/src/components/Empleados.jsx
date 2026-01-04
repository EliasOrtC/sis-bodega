import React, { useRef } from 'react';
import { Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelection } from '../CSS/SelectionContext.jsx';
import useTableData from '../hooks/useTableData';

const Employees = () => {
  const { selectedItem, setSelectedItem } = useSelection();
  const tableRef = useRef(null);

  const {
    data: employees,
    loading,
    error,
    tableClass,
    maxHeightValue,
    timeTransition
  } = useTableData('empleados', 'employeesUpdated', selectedItem, setSelectedItem);

  return (
    <Grid container spacing={2} sx={{ mt: 8, p: 2 }}>
      <Grid item xs={12}>
        <Card sx={{ width: '100%' }} className='tarjeta'>
          <CardContent className='tarjeta-contenido'>
            <Typography variant="h4">Empleados</Typography>
            <Typography>Módulo de Empleados</Typography>
            <TableContainer ref={tableRef} component={Paper} className={`${tableClass} div-contenedor-tabla `} sx={{ mt: 2, height: 'auto', maxHeight: maxHeightValue, transition: `max-height ${timeTransition}s ease`, overflowY: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombres y Apellidos</TableCell>
                    <TableCell>Estado Civil</TableCell>
                    <TableCell>Sexo</TableCell>
                    <TableCell>Sector</TableCell>
                    <TableCell>Supervisor</TableCell>
                    <TableCell>Salario Base</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(employees) && employees.map((employee, index) => (
                    <TableRow
                      key={employee.id}
                      style={{
                        opacity: 0,
                        animation: `fadeIn 0.2s forwards cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.2}s`,
                      }}
                      onClick={() => {
                        setSelectedItem(selectedItem?.id === employee.id ? null : employee);
                      }}
                      selected={selectedItem?.id === employee.id}
                    >
                      <TableCell>{employee.nombres + ' ' + employee.apellidos}</TableCell>
                      <TableCell>{employee.estadoCivil}</TableCell>
                      <TableCell>{employee.sexo}</TableCell>
                      <TableCell>{employee.sector}</TableCell>
                      <TableCell>{employee.supervisor ? employee.supervisor.nombres + ' ' + employee.supervisor.apellidos : 'Sin supervisor'}</TableCell>
                      <TableCell>{employee.salarioBase}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {loading ? <Typography variant="body2" color="green" backgroundColor="#ffffffcf" fontSize='1.2rem'>Cargando empleados...</Typography> : null}
              {error ? <Typography variant="body2" color="error" backgroundColor="#ffffffcf" fontSize='1.2rem'>Error al obtener los empleados {error}</Typography> : null}
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Employees;