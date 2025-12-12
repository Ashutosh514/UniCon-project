const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Missing Cloudinary environment variables. Please check your .env file.');
    console.error('Required variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

let storage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    // Use Cloudinary storage
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'unicon_skill_thumbnails', // Folder name in Cloudinary
            format: async (req, file) => 'png', // supports promises as well
            public_id: (req, file) => `skill-${Date.now()}-${file.originalname.split('.')[0]}`,
        },
    });
} else {
    // Fallback to local disk storage when Cloudinary is not configured
    const path = require('path');

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = 'uploads/skill_thumbnails';

            // Create directory if it doesn't exist
            const fs = require('fs');
            try {
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                    console.log(`Created upload directory: ${uploadDir}`);
                }
                cb(null, uploadDir);
            } catch (error) {
                console.error(`Error creating upload directory ${uploadDir}:`, error);
                cb(error);
            }
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
            console.log(`Generated filename: ${filename}`);
            cb(null, filename);
        }
    });
}

// Filter to accept only image files
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed for thumbnails!'), false);
    }
};

// Initialize multer for skill thumbnail uploads
const uploadSkillThumbnail = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB file size limit
    },
});

module.exports = uploadSkillThumbnail;
