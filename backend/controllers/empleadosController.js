const db = require('../config/db');
const scanner = require('../utils/socketNotifier');
const { logAction, getDiffDescription } = require('../utils/logger');

exports.getEmpleados = async (req, res) => {
    try {
        const result = await db.execute('SELECT e.Id_Empleado, e.Nombres, e.Apellidos, e.EstadoCivil, e.Sexo, e.FechaDeNacimiento, e.FechaDeInicioContrato, e.FechaDeFinContrato, e.Ruc, e.NumCedula, e.NumInss, e.Estado, e.Sector, e.Id_Supervisor, p.Nombres AS SupervisorNombres, p.Apellidos AS SupervisorApellidos, e.SalarioBase FROM Empleados e LEFT JOIN Empleados p ON e.Id_Supervisor = p.Id_Empleado');
        const data = result.rows.map(row => ({
            id: row[0], nombres: row[1], apellidos: row[2], estadoCivil: row[3], sexo: row[4], fechaDeNacimiento: row[5], fechaDeInicioContrato: row[6], fechaDeFinContrato: row[7], ruc: row[8], numCedula: row[9], numInss: row[10], estado: row[11], sector: row[12],
            supervisor: row[13] ? { id: row[13], nombres: row[14], apellidos: row[15] } : null, salarioBase: row[16]
        }));
        res.json(data);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Error fetching employees data' });
    }
};

exports.addEmpleado = async (req, res) => {
    try {
        const { nombres, apellidos, estadoCivil, sexo, fechaDeNacimiento, fechaDeInicioContrato, fechaDeFinContrato, ruc, numCedula, numInss, estado, sector, supervisor, salarioBase } = req.body;
        const { id: userId, username } = req.user;
        await db.execute('INSERT INTO Empleados (Nombres, Apellidos, EstadoCivil, Sexo, FechaDeNacimiento, FechaDeInicioContrato, FechaDeFinContrato, RUC, NumCedula, NumInss, Estado, Sector, Id_Supervisor, SalarioBase) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [nombres, apellidos, estadoCivil, sexo, fechaDeNacimiento, fechaDeInicioContrato, fechaDeFinContrato, ruc, numCedula, numInss, estado, sector, supervisor, salarioBase]);
        await logAction(userId, username, 'Empleados', 'INSERT', `Empleado agregado: ${nombres} ${apellidos}`);
        scanner.notificarEmpleados();
        res.status(201).json({ message: 'Empleado agregado correctamente' });
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).json({ error: 'Error al agregar el empleado' });
    }
};

exports.updateEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombres, apellidos, estadoCivil, sexo, fechaDeNacimiento, fechaDeInicioContrato, fechaDeFinContrato, ruc, numCedula, numInss, estado, sector, Supervisor, salarioBase } = req.body;
        const { id: userId, username } = req.user;

        // Comparación de cambios
        const oldResult = await db.execute('SELECT * FROM Empleados WHERE Id_Empleado = ?', [id]);
        if (oldResult.rows.length > 0) {
            const row = oldResult.rows[0];
            const oldData = { nombres: row[1], apellidos: row[2], estadoCivil: row[3], sexo: row[4], fechaDeNacimiento: row[5], fechaDeInicioContrato: row[6], fechaDeFinContrato: row[7], ruc: row[8], numCedula: row[9], numInss: row[10], estado: row[11], sector: row[12], Supervisor: row[13], salarioBase: row[14] };
            const diff = getDiffDescription(oldData, req.body);
            await logAction(userId, username, 'Empleados', 'UPDATE', `Empleado ID ${id} (${nombres}): ${diff}`);
        }

        await db.execute('UPDATE Empleados SET Nombres = ?, Apellidos = ?, EstadoCivil = ?, Sexo = ?, FechaDeNacimiento = ?, FechaDeInicioContrato = ?, FechaDeFinContrato = ?, RUC = ?, NumCedula = ?, NumInss = ?, Estado = ?, Sector = ?, Id_Supervisor = ?, SalarioBase = ? WHERE Id_Empleado = ?', [nombres, apellidos, estadoCivil, sexo, fechaDeNacimiento, fechaDeInicioContrato, fechaDeFinContrato, ruc, numCedula, numInss, estado, sector, Supervisor, salarioBase, id]);
        scanner.notificarEmpleados();
        res.json({ message: 'Empleado actualizado correctamente' });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Error al actualizar el empleado' });
    }
};
