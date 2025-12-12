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

// Configure Cloudinary storage for Multer
let storage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    // Use Cloudinary storage
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: (req, file) => {
            let folderName = 'unicon_resources';
            let format = 'auto'; // Let Cloudinary determine format

            if (file.fieldname === 'resourceFile') { // For notes/PDFs
                folderName = 'unicon_notes_files';
                format = 'pdf'; // Force PDF format if it's a notes file
            } else if (file.fieldname === 'resourceImage') { // For book covers/images
                // Determine if this is for notes or books based on the request
                if (req.body && req.body.resourceType === 'notes') {
                    folderName = 'unicon_notes_images';
                    console.log('Using Cloudinary folder for notes image:', folderName);
                } else {
                    folderName = 'unicon_book_covers';
                    console.log('Using Cloudinary folder for book cover:', folderName);
                }
                format = 'png'; // Or 'jpg', 'webp' etc.
            }

            return {
                folder: folderName,
                format: format,
                public_id: `${file.fieldname}-${Date.now()}-${file.originalname.split('.')[0]}`,
            };
        },
    });
} else {
    // Fallback to local disk storage when Cloudinary is not configured
    const multer = require('multer');
    const path = require('path');

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            let uploadDir = 'uploads/resources';
            if (file.fieldname === 'resourceFile') {
                uploadDir = 'uploads/notes';
            } else if (file.fieldname === 'resourceImage') {
                // Determine if this is for notes or books based on the request
                if (req.body && req.body.resourceType === 'notes') {
                    uploadDir = 'uploads/notes_images';
                    console.log('Setting upload destination for notes image to:', uploadDir);
                } else {
                    uploadDir = 'uploads/book_covers';
                    console.log('Setting upload destination for book cover to:', uploadDir);
                }
            }

            console.log('Setting upload destination for', file.fieldname, 'to:', uploadDir);

            // Create directory if it doesn't exist
            const fs = require('fs');
            if (!fs.existsSync(uploadDir)) {
                console.log('Creating directory:', uploadDir);
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
            console.log('Generated filename for', file.fieldname, ':', filename);
            cb(null, filename);
        }
    });
}

// Filter to accept specific file types
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'resourceFile') {
        // Allow PDF, DOC, DOCX for notes
        if (file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, or DOCX files are allowed for notes!'), false);
        }
    } else if (file.fieldname === 'resourceImage') {
        // Allow image files for book covers
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for book covers!'), false);
        }
    } else {
        cb(new Error('Unexpected field name for file upload.'), false);
    }
};

// Initialize multer for resource uploads
// Use .fields() to handle multiple file inputs (one for file, one for image)
const uploadResourceFile = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB file size limit for resources
    },
});

module.exports = uploadResourceFile;
