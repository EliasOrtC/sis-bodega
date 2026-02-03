const express = require('express');
const router = express.Router();
const imagekitController = require('../controllers/imagekitController');

router.get('/auth', imagekitController.getAuthParameters);
router.post('/delete', imagekitController.deleteImageByURL);

module.exports = router;
