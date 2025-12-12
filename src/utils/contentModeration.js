/**
 * Client-Side Content Moderation Utilities
 * Layer 1: Pre-upload validation and basic checks
 */

// File type validation for NSFW content
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
];

export const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/wmv'
];

// Maximum file sizes (in bytes)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Suspicious file patterns that might indicate NSFW content
export const SUSPICIOUS_PATTERNS = [
    /adult/i,
    /nsfw/i,
    /porn/i,
    /xxx/i,
    /explicit/i,
    /nude/i,
    /sexy/i,
    /hot/i,
    /fetish/i,
    /bdsm/i,
    /erotic/i,
    /intimate/i,
    /private/i,
    /personal/i,
    /naked/i,
    /undressed/i
];

/**
 * Validate file type and size
 */
export const validateFileType = (file) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
        return {
            valid: false,
            error: 'Unsupported file type. Please upload images (JPEG, PNG, GIF, WebP) or videos (MP4, WebM, OGG).'
        };
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File too large. Maximum size: ${isImage ? '10MB' : '100MB'}.`
        };
    }

    return { valid: true };
};

/**
 * Check filename for suspicious patterns
 */
export const validateFileName = (fileName) => {
    const lowerFileName = fileName.toLowerCase();

    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(lowerFileName)) {
            return {
                valid: false,
                error: 'File name contains inappropriate content. Please rename your file.'
            };
        }
    }

    return { valid: true };
};

/**
 * Basic image analysis using canvas (client-side)
 */
export const analyzeImageContent = (file) => {
    return new Promise((resolve) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Basic color analysis for suspicious content
            let skinTonePixels = 0;
            let totalPixels = data.length / 4;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Basic skin tone detection (simplified)
                if (isSkinTone(r, g, b)) {
                    skinTonePixels++;
                }
            }

            const skinToneRatio = skinTonePixels / totalPixels;

            // Flag if more than 30% of image appears to be skin tone
            const suspicious = skinToneRatio > 0.3;

            resolve({
                suspicious,
                skinToneRatio,
                dimensions: { width: img.width, height: img.height },
                aspectRatio: img.width / img.height
            });
        };

        img.onerror = () => {
            resolve({ suspicious: false, error: 'Could not analyze image' });
        };

        img.src = URL.createObjectURL(file);
    });
};

/**
 * Basic skin tone detection
 */
const isSkinTone = (r, g, b) => {
    // Basic skin tone range detection
    return (
        r > 95 && g > 40 && b > 20 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
        Math.abs(r - g) > 15 &&
        r > g && r > b
    );
};

/**
 * Comprehensive pre-upload validation
 */
export const validateUploadContent = async (file) => {
    const results = {
        fileType: validateFileType(file),
        fileName: validateFileName(file.name),
        imageAnalysis: null,
        overallValid: true,
        warnings: [],
        errors: []
    };

    // Check file type and size
    if (!results.fileType.valid) {
        results.errors.push(results.fileType.error);
        results.overallValid = false;
    }

    // Check filename
    if (!results.fileName.valid) {
        results.errors.push(results.fileName.error);
        results.overallValid = false;
    }

    // Analyze image content if it's an image
    if (file.type.startsWith('image/') && results.fileType.valid) {
        try {
            results.imageAnalysis = await analyzeImageContent(file);

            if (results.imageAnalysis.suspicious) {
                results.warnings.push('Image content may be inappropriate. Please review before uploading.');
            }
        } catch (error) {
            console.warn('Could not analyze image content:', error);
        }
    }

    return results;
};

/**
 * Content policy agreement
 */
export const CONTENT_POLICY = {
    title: "Content Policy Agreement",
    rules: [
        "No adult, explicit, or NSFW content",
        "No nudity or sexual content",
        "No violence or graphic content",
        "No hate speech or harassment",
        "Content must be educational or professional",
        "Respect community guidelines",
        "Upload appropriate skill-sharing content only"
    ],
    consequences: [
        "Immediate content removal",
        "Account warning or suspension",
        "Permanent ban for repeated violations",
        "Legal action for severe violations"
    ]
};

/**
 * Get content policy agreement text
 */
export const getContentPolicyText = () => {
    return `
    By uploading content, you agree to our Content Policy:
    
    ${CONTENT_POLICY.rules.map(rule => `• ${rule}`).join('\n')}
    
    Violations may result in:
    ${CONTENT_POLICY.consequences.map(consequence => `• ${consequence}`).join('\n')}
  `;
};


