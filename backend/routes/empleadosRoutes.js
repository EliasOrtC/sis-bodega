const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleadosController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, empleadosController.getEmpleados);
router.post('/', auth, empleadosController.addEmpleado);
router.put('/:id', auth, empleadosController.updateEmpleado);

module.exports = router;
