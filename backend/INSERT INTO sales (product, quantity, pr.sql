/* INSERT INTO Clientes (
 Nombres,
 Apellidos,
 Correo,
 Telefono,
 FechaRegistro,
 NumCedula,
 Direccion
 )
 VALUES (
 'Carlos',
 'Martínez López',
 'carlos.m@gmail.com',
 '88881234',
 '2025-01-05',
 '001-050198-0001A',
 'Managua'
 ),
 (
 'Ana',
 'Gómez Pérez',
 'ana.gomez@gmail.com',
 '87773456',
 '2025-01-08',
 '001-120299-0002B',
 'Masaya'
 ),
 (
 'Luis',
 'Hernández Ruiz',
 'luis.h@gmail.com',
 '89994567',
 '2025-01-10',
 '001-090195-0003C',
 'Granada'
 ),
 (
 'María',
 'Torres Silva',
 'maria.t@gmail.com',
 '81234567',
 '2025-01-15',
 '001-250300-0004D',
 'León'
 ),
 (
 'José',
 'Ramírez Díaz',
 'jose.r@gmail.com',
 '82345678',
 '2025-01-20',
 '001-180297-0005E',
 'Chinandega'
 );
 INSERT INTO Empleados (
 Nombres,
 Apellidos,
 EstadoCivil,
 Sexo,
 FechaDeNacimiento,
 FechaDeInicioContrato,
 RUC,
 NumCedula,
 NumInss,
 Estado,
 Sector,
 Id_Supervisor,
 SalarioBase
 )
 VALUES (
 'Pedro',
 'López',
 'Soltero',
 'Masculino',
 '1990-03-12',
 '2022-01-10',
 'J031000001',
 '001-120390-0001A',
 '1234567',
 'Activo',
 'Ventas',
 NULL,
 12000
 ),
 (
 'Laura',
 'Morales',
 'Casada',
 'Femenino',
 '1992-07-25',
 '2021-05-15',
 'J031000002',
 '001-250792-0002B',
 '2345678',
 'Activo',
 'Caja',
 1,
 11000
 ),
 (
 'Miguel',
 'Castillo',
 'Soltero',
 'Masculino',
 '1988-11-02',
 '2020-03-20',
 'J031000003',
 '001-021188-0003C',
 '3456789',
 'Activo',
 'Bodega',
 1,
 13000
 ),
 (
 'Sofía',
 'Vargas',
 'Casada',
 'Femenino',
 '1995-01-18',
 '2023-06-01',
 'J031000004',
 '001-180195-0004D',
 '4567890',
 'Activo',
 'Ventas',
 1,
 10000
 ),
 (
 'Andrés',
 'Mejía',
 'Soltero',
 'Masculino',
 '1993-09-10',
 '2022-09-10',
 'J031000005',
 '001-100993-0005E',
 '5678901',
 'Activo',
 'Administración',
 NULL,
 15000
 );
 INSERT INTO Nomina (
 FechaActual,
 Id_Empleado,
 TotalHorasLaboradas,
 SalarioBase,
 HorasExtras,
 ComisionesPorVentas,
 SalarioBruto,
 InssLaboral,
 IR,
 TotalDeducciones,
 SalarioNeto
 )
 VALUES (
 '2025-01-31',
 1,
 160,
 12000,
 500,
 1500,
 14000,
 980,
 700,
 1680,
 12320
 ),
 (
 '2025-01-31',
 2,
 160,
 11000,
 300,
 800,
 12100,
 847,
 500,
 1347,
 10753
 ),
 (
 '2025-01-31',
 3,
 160,
 13000,
 400,
 0,
 13400,
 938,
 600,
 1538,
 11862
 ),
 (
 '2025-01-31',
 4,
 160,
 10000,
 200,
 1200,
 11400,
 798,
 400,
 1198,
 10202
 ),
 (
 '2025-01-31',
 5,
 160,
 15000,
 0,
 0,
 15000,
 1050,
 900,
 1950,
 13050
 );
 INSERT INTO Inventario (
 Nombre,
 TipoPaquete,
 Inventario,
 CantidadUnidades,
 CantidadPaquetes,
 PrecioVenta_Paq,
 PrecioCompra_Paq
 )
 VALUES ('Arroz 1kg', 1, 500, 0, 500, 45, 38),
 ('Azúcar 1kg', 1, 400, 0, 400, 40, 34),
 ('Aceite 1L', 1, 300, 0, 300, 85, 72),
 ('Frijoles 1kg', 1, 250, 0, 250, 60, 50),
 ('Harina 1kg', 1, 350, 0, 350, 42, 35);
 INSERT INTO Ventas (
 Id_Empleado,
 Id_Cliente,
 FechaRegistro,
 TotalVenta
 )
 VALUES (1, 1, '2025-02-01', 180),
 (4, 2, '2025-02-02', 125),
 (1, 3, '2025-02-03', 240),
 (4, 4, '2025-02-04', 90),
 (1, 5, '2025-02-05', 300);
 INSERT INTO DetallesDeVentas (
 Id_Venta,
 Id_Producto,
 CantidadPaquetes,
 PrecioUnitario,
 Subtotal,
 FechaRegistro
 )
 VALUES (1, 1, 2, 45, 90, '2025-02-01'),
 (1, 3, 1, 85, 85, '2025-02-01'),
 (2, 2, 2, 40, 80, '2025-02-02'),
 (3, 4, 4, 60, 240, '2025-02-03'),
 (5, 5, 5, 42, 210, '2025-02-05');
 INSERT INTO Proveedor (NombreProveedor, Telefono, Direccion)
 VALUES ('Distribuidora Central', 22556677, 'Managua'),
 ('Alimentos del Norte', 23334455, 'Estelí'),
 ('Productos La Canasta', 22223333, 'León'),
 ('Comercial San Martín', 25554433, 'Chinandega'),
 ('Mayorista El Ahorro', 22778899, 'Masaya');
 INSERT INTO Compras (FechaDeCompra, Id_Proveedor, TotalCompra)
 VALUES ('2025-01-05', 1, 12000),
 ('2025-01-10', 2, 9500),
 ('2025-01-15', 3, 8300),
 ('2025-01-20', 4, 10400),
 ('2025-01-25', 5, 11000);
 INSERT INTO DetallesDeCompras (
 Id_Compra,
 Id_Producto,
 CantidadPaquetes,
 PrecioSinDescuento,
 Subtotal,
 IVA,
 TotalConIva
 )
 VALUES (1, 1, 100, 38, 3800, 570, 4370),
 (2, 2, 100, 34, 3400, 510, 3910),
 (3, 3, 50, 72, 3600, 540, 4140),
 (4, 4, 80, 50, 4000, 600, 4600),
 (5, 5, 120, 35, 4200, 630, 4830);
 INSERT INTO Usuarios (NombreCompleto, NUsuario, Contraseña, Email, rol)
 VALUES (
 'Administrador General',
 'admin',
 '$2b$10$u1QJYc1nZ9kM0hF5y9gZzOZp7M9Zz9C3H7zvFJ0J4x6pHc7bQm2u6',
 'admin@sistema.com',
 'Admin'
 ),
 (
 'Pedro López',
 'plopez',
 '$2b$10$9eK5hCzQ9rXzR2cY9qFvSezYkYH0mN2B0g5X9Q7B0xP2J5Xx6l0kK',
 'pedro@sistema.com',
 'Empleado'
 ),
 (
 'Laura Morales',
 'lmorales',
 '$2b$10$9eK5hCzQ9rXzR2cY9qFvSezYkYH0mN2B0g5X9Q7B0xP2J5Xx6l0kK',
 'laura@sistema.com',
 'Empleado'
 ),
 (
 'Miguel Castillo',
 'mcastillo',
 '$2b$10$9eK5hCzQ9rXzR2cY9qFvSezYkYH0mN2B0g5X9Q7B0xP2J5Xx6l0kK',
 'miguel@sistema.com',
 'Empleado'
 ),
 (
 'Sofía Vargas',
 'svargas',
 '$2b$10$9eK5hCzQ9rXzR2cY9qFvSezYkYH0mN2B0g5X9Q7B0xP2J5Xx6l0kK',
 'sofia@sistema.com',
 'Empleado'
 ); */
select *
from Ventas;
/* DROP TABLE IF EXISTS Empleados;
 DROP TABLE IF EXISTS Proveedor;
 DROP TABLE IF EXISTS Compras;
 DROP TABLE IF EXISTS Ventas;
 DROP TABLE IF EXISTS Clientes;
 DROP TABLE IF EXISTS Usuarios;
 DROP TABLE IF EXISTS Inventario; */