const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');

router.get('/', historialController.getHistorial);

module.exports = router;
