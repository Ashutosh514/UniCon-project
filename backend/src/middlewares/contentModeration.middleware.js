/**
 * Server-Side Content Moderation Middleware
 * Layer 2: File analysis, metadata validation, and basic content checks
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// File type validation
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
];

const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/mov',
    'video/wmv'
];

// Maximum file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 * 1024; // 100GB

// Suspicious file patterns
const SUSPICIOUS_PATTERNS = [
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

// Known NSFW file signatures (magic numbers)
const NSFW_SIGNATURES = {
    // Add known NSFW file signatures here
    // This is a placeholder - in practice, you'd maintain a database of known NSFW file hashes
};

/**
 * Validate file type and size
 */
const validateFileType = (file) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);

    if (!isImage && !isVideo) {
        return {
            valid: false,
            error: 'Unsupported file type',
            riskLevel: 'high'
        };
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File too large',
            riskLevel: 'medium'
        };
    }

    return {
        valid: true,
        riskLevel: 'low',
        fileType: isImage ? 'image' : 'video'
    };
};

/**
 * Check filename for suspicious patterns
 */
const validateFileName = (fileName) => {
    const lowerFileName = fileName.toLowerCase();

    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(lowerFileName)) {
            return {
                valid: false,
                error: 'Suspicious filename detected',
                riskLevel: 'high',
                matchedPattern: pattern.toString()
            };
        }
    }

    return { valid: true, riskLevel: 'low' };
};

/**
 * Generate file hash for duplicate detection
 */
const generateFileHash = (filePath) => {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
        console.error('Error generating file hash:', error);
        return null;
    }
};

/**
 * Check if file hash matches known NSFW content
 */
const checkKnownNSFW = (fileHash) => {
    // In a real implementation, you'd check against a database of known NSFW hashes
    return {
        isNSFW: false, // Placeholder
        confidence: 0,
        source: 'hash_check'
    };
};

/**
 * Validate text content for inappropriate language
 */
const validateTextContent = (text) => {
    const lowerText = text.toLowerCase();

    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(lowerText)) {
            return {
                valid: false,
                error: 'Inappropriate content detected in text',
                riskLevel: 'high',
                matchedPattern: pattern.toString()
            };
        }
    }

    return { valid: true, riskLevel: 'low' };
};

/**
 * Validate URL for suspicious content
 */
const validateUrl = (url) => {
    const lowerUrl = url.toLowerCase();

    // Check for suspicious domains or paths
    const suspiciousDomains = [
        'adult', 'porn', 'xxx', 'nsfw', 'nude', 'sexy', 'explicit'
    ];

    for (const domain of suspiciousDomains) {
        if (lowerUrl.includes(domain)) {
            return {
                valid: false,
                error: 'Suspicious URL detected',
                riskLevel: 'high',
                matchedDomain: domain
            };
        }
    }

    return { valid: true, riskLevel: 'low' };
};

/**
 * Basic image metadata analysis
 */
const analyzeImageMetadata = (filePath) => {
    return new Promise((resolve) => {
        try {
            // This is a simplified version - in practice, you'd use a library like 'exifr'
            // to extract detailed metadata from images
            const stats = fs.statSync(filePath);

            resolve({
                fileSize: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                suspicious: false,
                riskLevel: 'low'
            });
        } catch (error) {
            console.error('Error analyzing image metadata:', error);
            resolve({
                suspicious: true,
                riskLevel: 'medium',
                error: 'Could not analyze metadata'
            });
        }
    });
};

/**
 * Content moderation middleware
 */
const contentModerationMiddleware = async (req, res, next) => {
    try {
        const moderationResults = {
            timestamp: new Date(),
            userId: req.userId,
            fileAnalysis: {},
            textAnalysis: {},
            riskAssessment: {
                overallRisk: 'low',
                factors: [],
                confidence: 0
            },
            action: 'allow',
            quarantine: false
        };

        // Analyze text content for inappropriate language
        if (req.body) {
            const textContent = `${req.body.title || ''} ${req.body.description || ''}`;
            const textValidation = validateTextContent(textContent);
            moderationResults.textAnalysis = textValidation;

            if (!textValidation.valid) {
                moderationResults.riskAssessment.overallRisk = textValidation.riskLevel;
                moderationResults.riskAssessment.factors.push(textValidation.error);
                moderationResults.action = 'block';

                return res.status(400).json({
                    message: 'Content blocked',
                    reason: textValidation.error,
                    moderationId: crypto.randomUUID()
                });
            }
        }

        // Analyze thumbnail URL for suspicious content
        if (req.body.thumbnailUrl) {
            const urlValidation = validateUrl(req.body.thumbnailUrl);
            moderationResults.textAnalysis.thumbnailUrl = urlValidation;

            if (!urlValidation.valid) {
                moderationResults.riskAssessment.overallRisk = urlValidation.riskLevel;
                moderationResults.riskAssessment.factors.push(urlValidation.error);
                moderationResults.action = 'block';

                return res.status(400).json({
                    message: 'Content blocked',
                    reason: urlValidation.error,
                    moderationId: crypto.randomUUID()
                });
            }
        }

        // Check if file was uploaded
        if (!req.file) {
            // No file uploaded, but text/URL analysis completed
            req.contentModeration = moderationResults;
            return next();
        }

        const file = req.file;
        console.log(`Content moderation check for file: ${file.originalname}`);

        // Layer 1: File type and size validation
        const fileTypeValidation = validateFileType(file);
        moderationResults.fileAnalysis.fileType = fileTypeValidation;

        if (!fileTypeValidation.valid) {
            moderationResults.riskAssessment.overallRisk = fileTypeValidation.riskLevel;
            moderationResults.riskAssessment.factors.push(fileTypeValidation.error);
            moderationResults.action = 'block';

            return res.status(400).json({
                message: 'Content blocked',
                reason: fileTypeValidation.error,
                moderationId: crypto.randomUUID()
            });
        }

        // Layer 2: Filename validation
        const fileNameValidation = validateFileName(file.originalname);
        moderationResults.fileAnalysis.fileName = fileNameValidation;

        if (!fileNameValidation.valid) {
            moderationResults.riskAssessment.overallRisk = fileNameValidation.riskLevel;
            moderationResults.riskAssessment.factors.push(fileNameValidation.error);
            moderationResults.action = 'block';

            return res.status(400).json({
                message: 'Content blocked',
                reason: fileNameValidation.error,
                moderationId: crypto.randomUUID()
            });
        }

        // Layer 3: File hash check
        const fileHash = generateFileHash(file.path);
        if (fileHash) {
            const nsfwCheck = checkKnownNSFW(fileHash);
            moderationResults.fileAnalysis.hash = {
                hash: fileHash,
                nsfwCheck
            };

            if (nsfwCheck.isNSFW) {
                moderationResults.riskAssessment.overallRisk = 'high';
                moderationResults.riskAssessment.factors.push('Known NSFW content detected');
                moderationResults.action = 'block';

                // Clean up the file
                fs.unlinkSync(file.path);

                return res.status(400).json({
                    message: 'Content blocked',
                    reason: 'Known inappropriate content detected',
                    moderationId: crypto.randomUUID()
                });
            }
        }

        // Layer 4: Metadata analysis
        if (fileTypeValidation.fileType === 'image') {
            const metadataAnalysis = await analyzeImageMetadata(file.path);
            moderationResults.fileAnalysis.metadata = metadataAnalysis;

            if (metadataAnalysis.suspicious) {
                moderationResults.riskAssessment.overallRisk = metadataAnalysis.riskLevel;
                moderationResults.riskAssessment.factors.push('Suspicious metadata detected');
                moderationResults.quarantine = true;
            }
        }

        // Calculate overall risk assessment
        const riskFactors = moderationResults.riskAssessment.factors.length;
        if (riskFactors === 0) {
            moderationResults.riskAssessment.overallRisk = 'low';
            moderationResults.riskAssessment.confidence = 0.9;
        } else if (riskFactors === 1) {
            moderationResults.riskAssessment.overallRisk = 'medium';
            moderationResults.riskAssessment.confidence = 0.7;
        } else {
            moderationResults.riskAssessment.overallRisk = 'high';
            moderationResults.riskAssessment.confidence = 0.8;
        }

        // Store moderation results for further processing
        req.contentModeration = moderationResults;

        // Log moderation results
        console.log('Content moderation results:', {
            file: file.originalname,
            risk: moderationResults.riskAssessment.overallRisk,
            action: moderationResults.action,
            quarantine: moderationResults.quarantine
        });

        next();

    } catch (error) {
        console.error('Content moderation error:', error);

        // In case of error, err on the side of caution
        return res.status(500).json({
            message: 'Content moderation failed',
            error: 'Unable to process upload safely'
        });
    }
};

module.exports = contentModerationMiddleware;
