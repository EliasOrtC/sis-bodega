const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middleware/authMiddleware');

router.get('/ventas-mensuales', auth, statsController.getVentasMensuales);
router.get('/productos-estrella', auth, statsController.getProductosEstrella);
router.get('/rendimiento-empleados', auth, statsController.getRendimientoEmpleados);
router.get('/niveles-stock', auth, statsController.getNivelesStock);

module.exports = router;
