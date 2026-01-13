const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, clientesController.getClientes);
router.post('/', auth, clientesController.addCliente);
router.put('/:id', auth, clientesController.updateCliente);

module.exports = router;
