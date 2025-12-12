/**
 * Cloudinary Content Moderation Service
 * Additional layer using Cloudinary's moderation capabilities
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Analyze image using Cloudinary's moderation
 */
const analyzeWithCloudinary = async (imagePath) => {
    try {
        // Upload image to Cloudinary for analysis
        const result = await cloudinary.uploader.upload(imagePath, {
            moderation: 'aws_rek', // Use AWS Rekognition for moderation
            notification_url: process.env.CLOUDINARY_WEBHOOK_URL, // Optional webhook
            resource_type: 'auto'
        });

        // Check moderation results
        const moderation = result.moderation;
        let nsfwScore = 0;
        let confidence = 0.5; // Default confidence for Cloudinary

        if (moderation && moderation.length > 0) {
            const moderationResult = moderation[0];

            // Check for inappropriate content
            if (moderationResult.status === 'rejected') {
                nsfwScore = 0.9; // High confidence for rejection
                confidence = 0.8;
            } else if (moderationResult.status === 'approved') {
                nsfwScore = 0.1; // Low score for approval
                confidence = 0.7;
            } else {
                nsfwScore = 0.5; // Uncertain
                confidence = 0.5;
            }
        }

        // Check for specific moderation labels
        if (result.moderation_info) {
            const labels = result.moderation_info.labels || [];
            const inappropriateLabels = labels.filter(label =>
                ['adult', 'explicit', 'nude', 'sexual'].some(keyword =>
                    label.toLowerCase().includes(keyword)
                )
            );

            if (inappropriateLabels.length > 0) {
                nsfwScore = Math.max(nsfwScore, 0.7);
            }
        }

        return {
            service: 'Cloudinary',
            success: true,
            nsfwScore,
            confidence,
            moderation: result.moderation,
            publicId: result.public_id,
            url: result.secure_url
        };

    } catch (error) {
        console.error('Cloudinary moderation error:', error);
        return {
            service: 'Cloudinary',
            success: false,
            error: error.message
        };
    }
};

/**
 * Delete image from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
};

/**
 * Get moderation status from Cloudinary
 */
const getModerationStatus = async (publicId) => {
    try {
        const result = await cloudinary.api.resource(publicId, {
            moderation: true
        });

        return {
            publicId,
            moderation: result.moderation,
            moderationInfo: result.moderation_info
        };
    } catch (error) {
        console.error('Error getting moderation status:', error);
        throw error;
    }
};

module.exports = {
    analyzeWithCloudinary,
    deleteFromCloudinary,
    getModerationStatus
};


