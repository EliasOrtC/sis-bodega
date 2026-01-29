const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middleware/authMiddleware');

router.get('/ventas-mensuales', auth, statsController.getVentasMensuales);
router.get('/productos-estrella', auth, statsController.getProductosEstrella);
router.get('/rendimiento-empleados', auth, statsController.getRendimientoEmpleados);
router.get('/niveles-stock', auth, statsController.getNivelesStock);
router.get('/ticket-promedio', auth, statsController.getTicketPromedio);
router.get('/ventas-semanales', auth, statsController.getVentasSemanales);
router.get('/distribucion-precios', auth, statsController.getDistribucionPrecios);
router.get('/baja-rotacion', auth, statsController.getProductosBajaRotacion);

module.exports = router;
