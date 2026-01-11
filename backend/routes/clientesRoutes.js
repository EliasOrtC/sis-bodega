const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');

router.get('/', clientesController.getClientes);
router.post('/', clientesController.addCliente);
router.put('/:id', clientesController.updateCliente);

module.exports = router;
