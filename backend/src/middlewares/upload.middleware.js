    const multer = require('multer');
    const path = require('path');

    // Configure storage for uploaded files
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            // Set the destination folder for uploads
            // Make sure this 'uploads' folder exists in your backend root directory
            cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
            // Create a unique filename for the uploaded file
            cb(null, Date.now() + '-' + file.originalname);
        },
    });

    // Filter to accept only image files
    const fileFilter = (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    };

    // Initialize multer with storage and file filter
    const upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5 MB file size limit
        },
    });

    module.exports = upload;
    