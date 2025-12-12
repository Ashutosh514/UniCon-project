const LostItem = require('../models/LostItem');

// Get all lost/found items
const getAllLostItems = async (req, res) => {
    try {
        const items = await LostItem.find().sort({ timestamp: -1 }); // Sort by newest first
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve lost items', error: error.message });
    }
};

// Create a new lost/found item
const PostReview = require('../models/PostReview');
const createLostItem = async (req, res) => {
    try {
        // Basic mapping
        const { item_name, description, location, type, contact_info, user_name, user_id } = req.body;
        const userId = req.userId;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : '';

        const payload = {
            title: item_name,
            category: type,
            description,
            location,
            date: new Date().toISOString().split('T')[0],
            reportedBy: user_name || 'Anonymous',
            userType: 'Student',
            image: imagePath,
            status: type,
            contactEmail: contact_info,
            userId: user_id || userId,
            timestamp: Date.now()
        };

        // If the user is admin, immediately create the live item
        if (req.userRole === 'admin') {
            const newItem = new LostItem(payload);
            const savedItem = await newItem.save();
            return res.status(201).json(savedItem);
        }

        // Otherwise, create a post review for admin moderation
        const postReview = new PostReview({ type: 'lostitem', payload, uploadedBy: userId });
        await postReview.save();

        res.status(202).json({ message: 'Item submitted for moderation', reviewId: postReview._id });
    } catch (error) {
        console.error("Error in createLostItem:", error);
        res.status(400).json({ message: 'Invalid lost item data or file upload issue', error: error.message });
    }
};

// Delete a lost/found item by ID
const deleteLostItem = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId; // Get the user ID from the auth middleware

        const item = await LostItem.findById(id);

        if (!item) {
            return res.status(404).json({ message: 'Lost item not found' });
        }

        // Authorization check: allow the creator or an admin to delete the item
        if (item.userId !== userId && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'You are not authorized to delete this item' });
        }

        // Optional: If storing files locally, delete the file from the server as well
        // const fs = require('fs');
        // if (item.image && item.image.startsWith('/uploads/')) {
        //     const filePath = path.join(__dirname, '../..', item.image);
        //     fs.unlink(filePath, (err) => {
        //         if (err) console.error("Failed to delete local image file:", err);
        //     });
        // }

        await LostItem.findByIdAndDelete(id);
        res.status(200).json({ message: 'Lost item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete lost item', error: error.message });
    }
};

module.exports = {
    getAllLostItems,
    createLostItem,
    deleteLostItem,
};
