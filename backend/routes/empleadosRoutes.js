const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleadosController');

router.get('/', empleadosController.getEmpleados);
router.post('/', empleadosController.addEmpleado);
router.put('/:id', empleadosController.updateEmpleado);

module.exports = router;
