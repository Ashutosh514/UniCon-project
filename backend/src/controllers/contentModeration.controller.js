/**
 * Content Moderation Controller
 * Layer 5: Real-time content moderation and review management
 */

const ContentReview = require('../models/ContentReview');
const { analyzeContentWithAI } = require('../services/aiModeration.service');
const fs = require('fs');
const path = require('path');

/**
 * Process uploaded content through moderation pipeline
 */
const processContentUpload = async (req, res) => {
    try {
        const { file, contentModeration, userId } = req;

        console.log(`Processing content upload: ${file.originalname}`);

        // Create content review record
        const contentReview = new ContentReview({
            originalFileName: file.originalname,
            filePath: file.path,
            fileType: contentModeration.fileAnalysis.fileType.fileType,
            fileSize: file.size,
            uploadedBy: userId,
            moderationResults: contentModeration
        });

        // If content was flagged for quarantine, save and return
        if (contentModeration.quarantine || contentModeration.riskAssessment.overallRisk === 'high') {
            contentReview.status = 'quarantined';
            contentReview.action = 'quarantine';
            await contentReview.save();

            return res.status(202).json({
                message: 'Content uploaded but requires review',
                status: 'quarantined',
                reviewId: contentReview._id,
                reason: 'Content flagged for manual review'
            });
        }

        // Run AI analysis for medium risk content
        if (contentModeration.riskAssessment.overallRisk === 'medium') {
            try {
                const aiResults = await analyzeContentWithAI(file.path);
                contentReview.moderationResults.aiAnalysis = aiResults;

                // Update action based on AI results
                if (aiResults.recommendation === 'block') {
                    contentReview.status = 'rejected';
                    contentReview.action = 'block';

                    // Clean up the file
                    fs.unlinkSync(file.path);

                    await contentReview.save();

                    return res.status(400).json({
                        message: 'Content blocked',
                        reason: 'AI detected inappropriate content',
                        reviewId: contentReview._id
                    });
                } else if (aiResults.recommendation === 'quarantine') {
                    contentReview.status = 'quarantined';
                    contentReview.action = 'quarantine';
                    await contentReview.save();

                    return res.status(202).json({
                        message: 'Content uploaded but requires review',
                        status: 'quarantined',
                        reviewId: contentReview._id,
                        reason: 'AI flagged content for review'
                    });
                }
            } catch (aiError) {
                console.error('AI analysis failed:', aiError);
                // If AI analysis fails, quarantine the content
                contentReview.status = 'quarantined';
                contentReview.action = 'quarantine';
                await contentReview.save();

                return res.status(202).json({
                    message: 'Content uploaded but requires review',
                    status: 'quarantined',
                    reviewId: contentReview._id,
                    reason: 'AI analysis failed - manual review required'
                });
            }
        }

        // Content passed all checks
        contentReview.status = 'approved';
        contentReview.action = 'allow';
        await contentReview.save();

        res.status(200).json({
            message: 'Content approved and uploaded successfully',
            status: 'approved',
            reviewId: contentReview._id
        });

    } catch (error) {
        console.error('Content processing error:', error);
        res.status(500).json({
            message: 'Content processing failed',
            error: error.message
        });
    }
};

/**
 * Get content pending review (admin only)
 */
const getPendingReview = async (req, res) => {
    try {
        const { page = 1, limit = 20, riskLevel } = req.query;
        const skip = (page - 1) * limit;

        let query = { status: { $in: ['pending', 'quarantined'] } };

        if (riskLevel) {
            query['moderationResults.riskAssessment.overallRisk'] = riskLevel;
        }

        const content = await ContentReview.find(query)
            .populate('uploadedBy', 'fullName email')
            .populate('reviewedBy', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ContentReview.countDocuments(query);

        res.json({
            content,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                hasNext: skip + content.length < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching pending review:', error);
        res.status(500).json({
            message: 'Failed to fetch pending review',
            error: error.message
        });
    }
};

/**
 * Review content (approve/reject/quarantine)
 */
const reviewContent = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { action, notes } = req.body;
        const reviewerId = req.userId;

        const contentReview = await ContentReview.findById(reviewId);

        if (!contentReview) {
            return res.status(404).json({
                message: 'Content review not found'
            });
        }

        if (!['approve', 'reject', 'quarantine', 'escalate'].includes(action)) {
            return res.status(400).json({
                message: 'Invalid action. Must be: approve, reject, quarantine, or escalate'
            });
        }

        // Perform the action
        switch (action) {
            case 'approve':
                await contentReview.approve(reviewerId, notes);
                break;
            case 'reject':
                await contentReview.reject(reviewerId, notes);
                // Clean up the file
                if (fs.existsSync(contentReview.filePath)) {
                    fs.unlinkSync(contentReview.filePath);
                }
                break;
            case 'quarantine':
                await contentReview.quarantine(reviewerId, notes);
                break;
            case 'escalate':
                await contentReview.escalate(reviewerId, notes);
                break;
        }

        res.json({
            message: `Content ${action}d successfully`,
            reviewId: contentReview._id,
            status: contentReview.status,
            action: contentReview.action
        });

    } catch (error) {
        console.error('Error reviewing content:', error);
        res.status(500).json({
            message: 'Failed to review content',
            error: error.message
        });
    }
};

/**
 * Get content review statistics
 */
const getModerationStats = async (req, res) => {
    try {
        const stats = await ContentReview.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const riskStats = await ContentReview.aggregate([
            {
                $group: {
                    _id: '$moderationResults.riskAssessment.overallRisk',
                    count: { $sum: 1 }
                }
            }
        ]);

        const actionStats = await ContentReview.aggregate([
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentActivity = await ContentReview.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.date': -1 }
            }
        ]);

        res.json({
            statusStats: stats,
            riskStats: riskStats,
            actionStats: actionStats,
            recentActivity: recentActivity
        });

    } catch (error) {
        console.error('Error fetching moderation stats:', error);
        res.status(500).json({
            message: 'Failed to fetch moderation statistics',
            error: error.message
        });
    }
};

/**
 * Request appeal for rejected content
 */
const requestAppeal = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;
        const userId = req.userId;

        const contentReview = await ContentReview.findById(reviewId);

        if (!contentReview) {
            return res.status(404).json({
                message: 'Content review not found'
            });
        }

        if (contentReview.uploadedBy.toString() !== userId) {
            return res.status(403).json({
                message: 'You can only appeal your own content'
            });
        }

        if (contentReview.appeal.requested) {
            return res.status(400).json({
                message: 'Appeal already requested for this content'
            });
        }

        await contentReview.requestAppeal(userId, reason);

        res.json({
            message: 'Appeal requested successfully',
            reviewId: contentReview._id,
            appealStatus: 'pending'
        });

    } catch (error) {
        console.error('Error requesting appeal:', error);
        res.status(500).json({
            message: 'Failed to request appeal',
            error: error.message
        });
    }
};

/**
 * Review appeal (admin only)
 */
const reviewAppeal = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { approved, notes } = req.body;
        const reviewerId = req.userId;

        const contentReview = await ContentReview.findById(reviewId);

        if (!contentReview) {
            return res.status(404).json({
                message: 'Content review not found'
            });
        }

        if (!contentReview.appeal.requested) {
            return res.status(400).json({
                message: 'No appeal requested for this content'
            });
        }

        await contentReview.reviewAppeal(reviewerId, approved, notes);

        res.json({
            message: `Appeal ${approved ? 'approved' : 'rejected'}`,
            reviewId: contentReview._id,
            status: contentReview.status,
            action: contentReview.action
        });

    } catch (error) {
        console.error('Error reviewing appeal:', error);
        res.status(500).json({
            message: 'Failed to review appeal',
            error: error.message
        });
    }
};

/**
 * Get user's content review history
 */
const getUserContentHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const content = await ContentReview.find({ uploadedBy: userId })
            .populate('reviewedBy', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ContentReview.countDocuments({ uploadedBy: userId });

        res.json({
            content,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                hasNext: skip + content.length < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching user content history:', error);
        res.status(500).json({
            message: 'Failed to fetch content history',
            error: error.message
        });
    }
};

module.exports = {
    processContentUpload,
    getPendingReview,
    reviewContent,
    getModerationStats,
    requestAppeal,
    reviewAppeal,
    getUserContentHistory
};
