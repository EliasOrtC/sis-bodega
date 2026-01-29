const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/authMiddleware');

// Protegemos el endpoint de la IA para que solo usuarios autenticados puedan usarla
router.post('/chat', auth, aiController.chatWithAI);
router.get('/quota', auth, aiController.getQuota);

module.exports = router;
