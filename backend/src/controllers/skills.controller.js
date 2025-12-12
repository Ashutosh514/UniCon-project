const Skill = require('../models/skill');

// Get all skills
const getAllSkills = async (req, res) => {
    try {
        const skills = await Skill.find().sort({ timestamp: -1 }); // Sort by newest first
        res.status(200).json(skills);
    } catch (error) {
        console.error("Error in getAllSkills:", error);
        res.status(500).json({ message: 'Failed to retrieve skills', error: error.message });
    }
};

// Create a new skill
const PostReview = require('../models/PostReview');
const createSkill = async (req, res) => {
    try {
        const { title, description, category, videoUrl, type, postedBy, userType } = req.body;
        const userId = req.userId;

        let thumbnailUrl = '';
        if (req.file) {
            if (req.file.path && req.file.path.startsWith('http')) {
                thumbnailUrl = req.file.path;
            } else {
                thumbnailUrl = `/uploads/skill_thumbnails/${req.file.filename}`;
            }
        } else if (req.body.thumbnailUrl) {
            thumbnailUrl = req.body.thumbnailUrl;
        }

        const payload = { title, description, category, videoUrl, thumbnailUrl, type, userId, postedBy };

        if (req.userRole === 'admin') {
            const newSkill = new Skill(payload);
            const savedSkill = await newSkill.save();
            return res.status(201).json(savedSkill);
        }

        const postReview = new PostReview({ type: 'skill', payload, uploadedBy: userId });
        await postReview.save();
        res.status(202).json({ message: 'Skill submitted for moderation', reviewId: postReview._id });
    } catch (error) {
        console.error("Error in createSkill:", error);
        res.status(500).json({ message: 'Failed to create skill', error: error.message });
    }
};

// Delete a skill by ID
const deleteSkill = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId; // Get the user ID from the auth middleware

        const skill = await Skill.findById(id);

        if (!skill) {
            return res.status(404).json({ message: 'Skill not found' });
        }

        // Authorization check: allow the creator or an admin to delete the skill
        if (skill.userId !== userId && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'You are not authorized to delete this skill' });
        }

        // Optional: If you want to delete the image from Cloudinary when the skill is deleted,
        // you would add Cloudinary.uploader.destroy(public_id) here.
        // This requires storing the public_id in your MongoDB document.

        await Skill.findByIdAndDelete(id);
        res.status(200).json({ message: 'Skill deleted successfully' });
    } catch (error) {
        console.error("Error in deleteSkill:", error);
        res.status(500).json({ message: 'Failed to delete skill', error: error.message });
    }
};

module.exports = {
    getAllSkills,
    createSkill,
    deleteSkill
};
