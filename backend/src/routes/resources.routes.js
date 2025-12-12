const express = require('express');
const { getAllResources, createResource, deleteResource } = require('../controllers/resources.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const uploadResourceFile = require('../middlewares/uploadResourceFile.middleware'); // New import
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/', getAllResources);
// Use .fields() to handle multiple file inputs: 'resourceFile' for notes, 'resourceImage' for book covers
router.post(
    '/',
    authMiddleware,
    uploadResourceFile.fields([{ name: 'resourceFile', maxCount: 1 }, { name: 'resourceImage', maxCount: 1 }]),
    createResource
);
router.delete('/:id', authMiddleware, deleteResource);

// Add a route for downloading files
router.get('/download/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '..', '..', 'uploads', 'notes', filename);

        console.log('Download request for filename:', filename);
        console.log('Full file path:', filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log('File not found at path:', filePath);
            return res.status(404).json({ message: 'File not found' });
        }

        console.log('File found, proceeding with download');

        // Set appropriate headers for file download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Error downloading file', error: error.message });
    }
});

module.exports = router;
