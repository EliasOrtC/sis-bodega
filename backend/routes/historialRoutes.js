const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, historialController.getHistorial);

module.exports = router;
