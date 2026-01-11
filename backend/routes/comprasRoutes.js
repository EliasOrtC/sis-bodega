const express = require('express');
const router = express.Router();
const comprasController = require('../controllers/comprasController');

router.get('/', comprasController.getCompras);
router.post('/', comprasController.addCompra);
router.put('/:id', comprasController.updateCompra);

module.exports = router;
