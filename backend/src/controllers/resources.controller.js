const Resource = require('../models/Resource');

// Get all resources
const getAllResources = async (req, res) => {
    try {
        const resources = await Resource.find().sort({ timestamp: -1 }); // Sort by newest first
        res.status(200).json(resources);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve resources', error: error.message });
    }
};

// Create a new resource (note or book)
const createResource = async (req, res) => {
    try {
        // Debug: Log the request details
        console.log('Request body:', req.body);
        console.log('Request files:', req.files);
        console.log('User ID from auth middleware:', req.userId);

        const { title, description, category, subject, resourceType, contactEmail, contactPhone, postedBy } = req.body;
        const userId = req.userId; // From auth middleware

        let fileUrl = '';
        let imageUrl = '';

        // Check if files were uploaded and assign URLs
        if (req.files && req.files['resourceFile'] && req.files['resourceFile'][0]) {
            console.log('Resource file uploaded:', req.files['resourceFile'][0]);
            // Check if it's a Cloudinary URL or local file path
            if (req.files['resourceFile'][0].path && req.files['resourceFile'][0].path.startsWith('http')) {
                fileUrl = req.files['resourceFile'][0].path; // Cloudinary URL
                console.log('Using Cloudinary URL:', fileUrl);
            } else {
                fileUrl = `/uploads/notes/${req.files['resourceFile'][0].filename}`; // Local file path
                console.log('Using local file path:', fileUrl);
                console.log('Full file path:', req.files['resourceFile'][0].path);
            }
        }
        if (req.files && req.files['resourceImage'] && req.files['resourceImage'][0]) {
            console.log('Resource image uploaded:', req.files['resourceImage'][0]);
            // Check if it's a Cloudinary URL or local file path
            if (req.files['resourceImage'][0].path && req.files['resourceImage'][0].path.startsWith('http')) {
                imageUrl = req.files['resourceImage'][0].path; // Cloudinary URL
                console.log('Using Cloudinary URL for image:', imageUrl);
            } else {
                // Determine the correct path based on resource type
                if (resourceType === 'notes') {
                    imageUrl = `/uploads/notes_images/${req.files['resourceImage'][0].filename}`; // Local file path for notes
                    console.log('Using local file path for notes image:', imageUrl);
                } else {
                    imageUrl = `/uploads/book_covers/${req.files['resourceImage'][0].filename}`; // Local file path for books
                    console.log('Using local file path for book cover:', imageUrl);
                }
            }
        }

        const newResource = new Resource({
            title,
            description,
            category,
            subject,
            resourceType,
            fileUrl: fileUrl,
            imageUrl: imageUrl,
            contactEmail: resourceType === 'book' ? contactEmail : undefined, // Only save if resourceType is 'book'
            contactPhone,
            postedBy,
            userId,
            timestamp: Date.now(),
            status: resourceType === 'book' ? 'available' : undefined, // Default status for books
        });

        const savedResource = await newResource.save();
        res.status(201).json(savedResource);
    } catch (error) {
        console.error("Error in createResource:", error);
        res.status(400).json({ message: 'Invalid resource data or file upload issue', error: error.message });
    }
};

// Delete a resource by ID
const deleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId; // From auth middleware

        const resource = await Resource.findById(id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Authorization check: allow the creator or an admin to delete
        if (resource.userId !== userId && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'You are not authorized to delete this resource' });
        }

        // Optional: Delete files from Cloudinary if needed (requires storing public_id)
        // For simplicity, we are not implementing Cloudinary deletion here,
        // but it's good practice for production.

        await Resource.findByIdAndDelete(id);
        res.status(200).json({ message: 'Resource deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete resource', error: error.message });
    }
};

module.exports = {
    getAllResources,
    createResource,
    deleteResource,
};
