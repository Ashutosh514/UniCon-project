const express = require('express');
const { registerUser, loginUser, googleCallback } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google/callback', googleCallback);
router.get('/google/callback', googleCallback);

module.exports = router;
