const express = require('express');
const router = express.Router();
const comprasController = require('../controllers/comprasController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, comprasController.getProveedores);

module.exports = router;
