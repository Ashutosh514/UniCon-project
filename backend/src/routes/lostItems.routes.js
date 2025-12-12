const express = require('express');
const { getAllLostItems, createLostItem, deleteLostItem } = require('../controllers/lostItems.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const router = express.Router();

router.get('/', getAllLostItems);
// Added a specific error handler for Multer to ensure a JSON response on failure
router.post('/', authMiddleware, (req, res, next) => {
    upload.single('image')(req, res, function (err) {
        if (err) {
            // This is a Multer error, send a JSON response
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Max size is 5MB.' });
            }
            if (err.message === 'Only image files are allowed!') {
                return res.status(400).json({ message: 'Invalid file type. Only images are allowed.' });
            }
            // For other Multer errors
            return res.status(400).json({ message: err.message });
        }
        // If no error, proceed to the next middleware
        next();
    });
}, createLostItem);
router.delete('/:id', authMiddleware, deleteLostItem);

module.exports = router;
