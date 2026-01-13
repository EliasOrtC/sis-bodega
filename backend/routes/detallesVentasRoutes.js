const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');
const auth = require('../middleware/authMiddleware');

router.get('/:id_venta', auth, ventasController.getDetallesVenta);
router.post('/batch', auth, ventasController.addDetalleBatch);
router.put('/update', auth, ventasController.updateDetallesVenta);
router.delete('/:id_venta', auth, ventasController.deleteDetallesVenta);

module.exports = router;
