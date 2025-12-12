const mongoose = require('mongoose');

const PostReviewSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'lostitem' | 'skill' | 'note'
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    action: { type: String, enum: ['allow', 'block'], default: 'block' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

PostReviewSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

PostReviewSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PostReview', PostReviewSchema);
