/**
 * Content Review Model
 * Layer 4: Quarantine and review system for flagged content
 */

const mongoose = require('mongoose');

const ContentReviewSchema = new mongoose.Schema({
    // Basic content information
    originalFileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },

    // Upload information
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },

    // Moderation results
    moderationResults: {
        fileAnalysis: {
            fileType: Object,
            fileName: Object,
            metadata: Object,
            hash: Object
        },
        aiAnalysis: {
            overallNsfwScore: Number,
            confidence: Number,
            analyses: [Object],
            recommendation: String,
            reasons: [String]
        },
        riskAssessment: {
            overallRisk: String,
            factors: [String],
            confidence: Number
        }
    },

    // Review status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'quarantined', 'escalated'],
        default: 'pending'
    },

    // Review information
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewDate: {
        type: Date
    },
    reviewNotes: {
        type: String
    },

    // Action taken
    action: {
        type: String,
        enum: ['allow', 'block', 'quarantine', 'escalate'],
        default: 'quarantine'
    },

    // Appeal information
    appeal: {
        requested: {
            type: Boolean,
            default: false
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        requestedDate: {
            type: Date
        },
        appealReason: {
            type: String
        },
        appealStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        appealReviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        appealReviewDate: {
            type: Date
        }
    },

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
ContentReviewSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Index for efficient queries
ContentReviewSchema.index({ status: 1, createdAt: -1 });
ContentReviewSchema.index({ uploadedBy: 1, status: 1 });
ContentReviewSchema.index({ 'moderationResults.aiAnalysis.overallNsfwScore': -1 });

// Virtual for determining if content needs review
ContentReviewSchema.virtual('needsReview').get(function () {
    return this.status === 'pending' || this.status === 'quarantined';
});

// Virtual for determining if content is safe
ContentReviewSchema.virtual('isSafe').get(function () {
    return this.status === 'approved' && this.action === 'allow';
});

// Virtual for determining if content is blocked
ContentReviewSchema.virtual('isBlocked').get(function () {
    return this.status === 'rejected' && this.action === 'block';
});

// Method to approve content
ContentReviewSchema.methods.approve = function (reviewedBy, notes = '') {
    this.status = 'approved';
    this.action = 'allow';
    this.reviewedBy = reviewedBy;
    this.reviewDate = new Date();
    this.reviewNotes = notes;
    return this.save();
};

// Method to reject content
ContentReviewSchema.methods.reject = function (reviewedBy, notes = '') {
    this.status = 'rejected';
    this.action = 'block';
    this.reviewedBy = reviewedBy;
    this.reviewDate = new Date();
    this.reviewNotes = notes;
    return this.save();
};

// Method to quarantine content
ContentReviewSchema.methods.quarantine = function (reviewedBy, notes = '') {
    this.status = 'quarantined';
    this.action = 'quarantine';
    this.reviewedBy = reviewedBy;
    this.reviewDate = new Date();
    this.reviewNotes = notes;
    return this.save();
};

// Method to escalate content
ContentReviewSchema.methods.escalate = function (reviewedBy, notes = '') {
    this.status = 'escalated';
    this.action = 'escalate';
    this.reviewedBy = reviewedBy;
    this.reviewDate = new Date();
    this.reviewNotes = notes;
    return this.save();
};

// Method to request appeal
ContentReviewSchema.methods.requestAppeal = function (userId, reason) {
    this.appeal.requested = true;
    this.appeal.requestedBy = userId;
    this.appeal.requestedDate = new Date();
    this.appeal.appealReason = reason;
    this.appeal.appealStatus = 'pending';
    return this.save();
};

// Method to review appeal
ContentReviewSchema.methods.reviewAppeal = function (reviewedBy, approved, notes = '') {
    this.appeal.appealStatus = approved ? 'approved' : 'rejected';
    this.appeal.appealReviewedBy = reviewedBy;
    this.appeal.appealReviewDate = new Date();

    if (approved) {
        this.status = 'approved';
        this.action = 'allow';
    }

    return this.save();
};

// Static method to get content needing review
ContentReviewSchema.statics.getPendingReview = function (limit = 50) {
    return this.find({
        status: { $in: ['pending', 'quarantined'] }
    })
        .populate('uploadedBy', 'fullName email')
        .populate('reviewedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Static method to get content by risk level
ContentReviewSchema.statics.getByRiskLevel = function (riskLevel, limit = 50) {
    return this.find({
        'moderationResults.riskAssessment.overallRisk': riskLevel
    })
        .populate('uploadedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Static method to get statistics
ContentReviewSchema.statics.getStatistics = function () {
    return this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
};

module.exports = mongoose.model('ContentReview', ContentReviewSchema);


