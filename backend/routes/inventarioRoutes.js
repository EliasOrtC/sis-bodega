const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

router.get('/', inventarioController.getInventario);
router.post('/', inventarioController.addInventario);
router.put('/:id', inventarioController.updateInventario);

module.exports = router;
