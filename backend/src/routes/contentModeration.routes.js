/**
 * Content Moderation Routes
 * API endpoints for content review and management
 */

const express = require('express');
const {
    getPendingReview,
    reviewContent,
    getModerationStats,
    requestAppeal,
    reviewAppeal,
    getUserContentHistory
} = require('../controllers/contentModeration.controller');
const { authMiddleware, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// Get content pending review (admin only)
router.get('/pending', authMiddleware, requireAdmin, getPendingReview);

// Review content (admin only)
router.post('/review/:reviewId', authMiddleware, requireAdmin, reviewContent);

// Get moderation statistics (admin only)
router.get('/stats', authMiddleware, requireAdmin, getModerationStats);

// Request appeal for rejected content
router.post('/appeal/:reviewId', authMiddleware, requestAppeal);

// Review appeal (admin only)
router.post('/appeal/:reviewId/review', authMiddleware, requireAdmin, reviewAppeal);

// Get user's content history
router.get('/user/:userId', authMiddleware, getUserContentHistory);

module.exports = router;
