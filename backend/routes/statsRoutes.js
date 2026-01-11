const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/ventas-mensuales', statsController.getVentasMensuales);
router.get('/productos-estrella', statsController.getProductosEstrella);
router.get('/rendimiento-empleados', statsController.getRendimientoEmpleados);
router.get('/niveles-stock', statsController.getNivelesStock);

module.exports = router;
