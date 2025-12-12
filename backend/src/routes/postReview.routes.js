const express = require('express');
const { getPendingPosts, reviewPost } = require('../controllers/postReview.controller');
const { authMiddleware, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/pending', authMiddleware, requireAdmin, getPendingPosts);
router.post('/review/:reviewId', authMiddleware, requireAdmin, reviewPost);

module.exports = router;
