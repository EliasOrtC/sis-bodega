const express = require('express');
const router = express.Router();
const comprasController = require('../controllers/comprasController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, comprasController.getCompras);
router.post('/', auth, comprasController.addCompra);
router.put('/:id', auth, comprasController.updateCompra);

module.exports = router;
