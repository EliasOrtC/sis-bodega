const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, ventasController.getVentas);
router.post('/', auth, ventasController.addVenta);
router.put('/:id', auth, ventasController.updateVenta);

module.exports = router;
