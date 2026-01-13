const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, inventarioController.getInventario);
router.post('/', auth, inventarioController.addInventario);
router.put('/:id', auth, inventarioController.updateInventario);

module.exports = router;
