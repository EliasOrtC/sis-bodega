const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

router.get('/', ventasController.getVentas);
router.post('/', ventasController.addVenta);
router.put('/:id', ventasController.updateVenta);

module.exports = router;
