const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

router.get('/:id_venta', ventasController.getDetallesVenta);
router.post('/batch', ventasController.addDetalleBatch);
router.put('/update', ventasController.updateDetallesVenta);
router.delete('/:id_venta', ventasController.deleteDetallesVenta);

module.exports = router;
