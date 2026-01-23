const PostReview = require('../models/PostReview');
const LostItem = require('../models/LostItem');
const Skill = require('../models/skill');
const Resource = require('../models/Resource');

// Get pending post reviews
const getPendingPosts = async (req, res) => {
    try {
        const reviews = await PostReview.find({ status: 'pending' }).populate('uploadedBy', 'fullName email').sort({ createdAt: -1 }).limit(100);
        res.json({ reviews });
    } catch (err) {
        console.error('Error fetching pending posts:', err);
        res.status(500).json({ message: 'Failed to fetch pending posts' });
    }
};

// Review a post (approve/reject)
const reviewPost = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { action, notes } = req.body; // action: approve or reject
        const reviewerId = req.userId;

        const pr = await PostReview.findById(reviewId);
        if (!pr) return res.status(404).json({ message: 'Post review not found' });

        if (action === 'approve') {
            pr.status = 'approved';
            pr.action = 'allow';
            pr.reviewedBy = reviewerId;
            pr.reviewNotes = notes || '';
            await pr.save();

            // Create the live post depending on type
            if (pr.type === 'lostitem') {
                const item = new LostItem(pr.payload);
                await item.save();
            } else if (pr.type === 'skill') {
                const skill = new Skill(pr.payload);
                await skill.save();
            } else if (pr.type === 'note' || pr.type === 'resource' || pr.type === 'notes') {
                const resource = new Resource(pr.payload);
                await resource.save();
            }

            return res.json({ message: 'Post approved and published', reviewId: pr._id });
        } else if (action === 'reject') {
            pr.status = 'rejected';
            pr.action = 'block';
            pr.reviewedBy = reviewerId;
            pr.reviewNotes = notes || '';
            await pr.save();
            return res.json({ message: 'Post rejected and removed', reviewId: pr._id });
        }

        res.status(400).json({ message: 'Invalid action' });
    } catch (err) {
        console.error('Error reviewing post:', err);
        res.status(500).json({ message: 'Failed to review post' });
    }
};

module.exports = { getPendingPosts, reviewPost };
