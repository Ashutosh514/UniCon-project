const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Accept POST from client with id_token
router.post('/callback', authController.googleCallback);
// Also accept GET for optional direct validation (id_token in query)
router.get('/callback', authController.googleCallback);

module.exports = router;
