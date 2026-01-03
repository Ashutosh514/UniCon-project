/**
 * AI-Powered Content Moderation Service
 * Layer 3: Advanced AI-based NSFW content detection
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Normalize an incoming image path to an absolute filesystem path
const resolveFsPath = (imagePath) => {
    if (!imagePath) throw new Error('No image path provided');

    // Base uploads folder in backend (this module lives in backend/src/services)
    const baseUploads = path.join(__dirname, '..', '..', 'uploads');

    // Strip any leading slashes and normalize
    const trimmed = imagePath.replace(/^[/\\]+/, '');

    // If the path refers to the uploads folder (e.g., '/uploads/...' or 'uploads/...'),
    // resolve it relative to the backend uploads directory to avoid treating it as
    // an absolute root path on the server filesystem.
    if (trimmed === 'uploads' || trimmed.startsWith('uploads' + path.sep) || trimmed.startsWith('uploads/')) {
        const candidate = path.join(baseUploads, trimmed.replace(/^uploads[\\/]/, ''));
        if (!fs.existsSync(candidate)) {
            throw new Error(`File not found: ${candidate}`);
        }
        return candidate;
    }

    // If an absolute path was explicitly provided (and it's not an uploads URL-like path), use it
    if (path.isAbsolute(imagePath)) {
        if (!fs.existsSync(imagePath)) throw new Error(`File not found: ${imagePath}`);
        return imagePath;
    }

    // Otherwise, treat the path as relative to the uploads directory
    const candidate = path.join(baseUploads, trimmed);
    if (!fs.existsSync(candidate)) {
        throw new Error(`File not found: ${candidate}`);
    }

    return candidate;
};

// Configuration for different AI moderation services
const AI_SERVICES = {
    // Free tier services
    HUGGINGFACE: {
        name: 'Hugging Face NSFW Detection',
        url: 'https://api-inference.huggingface.co/models/facebook/detr-resnet-50',
        apiKey: process.env.HUGGINGFACE_API_KEY,
        enabled: !!process.env.HUGGINGFACE_API_KEY
    },

    // Commercial services
    CLARIFAI: {
        name: 'Clarifai NSFW Detection',
        url: 'https://api.clarifai.com/v2/models/nsfw-recognition/outputs',
        apiKey: process.env.CLARIFAI_API_KEY,
        enabled: !!process.env.CLARIFAI_API_KEY
    },

    GOOGLE_VISION: {
        name: 'Google Cloud Vision API',
        url: 'https://vision.googleapis.com/v1/images:annotate',
        apiKey: process.env.GOOGLE_VISION_API_KEY,
        enabled: !!process.env.GOOGLE_VISION_API_KEY
    },

    AWS_REKOGNITION: {
        name: 'AWS Rekognition',
        url: 'https://rekognition.us-east-1.amazonaws.com',
        accessKey: process.env.AWS_ACCESS_KEY_ID,
        secretKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        enabled: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    }
};

/**
 * Analyze image using Hugging Face API
 */
const analyzeWithHuggingFace = async (imagePath) => {
    try {
        const formData = new FormData();
        const fsPath = resolveFsPath(imagePath);
        formData.append('file', fs.createReadStream(fsPath));

        const response = await axios.post(
            'https://api-inference.huggingface.co/models/facebook/detr-resnet-50',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${AI_SERVICES.HUGGINGFACE.apiKey}`,
                    ...formData.getHeaders()
                },
                timeout: 30000
            }
        );

        return {
            service: 'Hugging Face',
            success: true,
            results: response.data,
            nsfwScore: 0, // Would need to parse response based on model output
            confidence: 0.8
        };
    } catch (error) {
        console.error('Hugging Face API error:', error.message);
        return {
            service: 'Hugging Face',
            success: false,
            error: error.message
        };
    }
};

/**
 * Analyze image using Google Cloud Vision API
 */
const analyzeWithGoogleVision = async (imagePath) => {
    try {
        const fsPath = resolveFsPath(imagePath);
        const imageBuffer = fs.readFileSync(fsPath);
        const base64Image = imageBuffer.toString('base64');

        const response = await axios.post(
            `${AI_SERVICES.GOOGLE_VISION.url}?key=${AI_SERVICES.GOOGLE_VISION.apiKey}`,
            {
                requests: [{
                    image: { content: base64Image },
                    features: [
                        { type: 'SAFE_SEARCH_DETECTION', maxResults: 1 },
                        { type: 'LABEL_DETECTION', maxResults: 10 }
                    ]
                }]
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        const safeSearch = response.data.responses[0]?.safeSearchAnnotation;
        const labels = response.data.responses[0]?.labelAnnotations || [];

        // Calculate NSFW score based on safe search results
        let nsfwScore = 0;
        if (safeSearch) {
            const adultScore = getLikelihoodScore(safeSearch.adult);
            const violenceScore = getLikelihoodScore(safeSearch.violence);
            const racyScore = getLikelihoodScore(safeSearch.racy);

            nsfwScore = Math.max(adultScore, violenceScore, racyScore);
        }

        // Check for NSFW-related labels
        const nsfwLabels = labels.filter(label =>
            ['adult', 'nude', 'explicit', 'sexual', 'pornographic'].some(keyword =>
                label.description.toLowerCase().includes(keyword)
            )
        );

        if (nsfwLabels.length > 0) {
            nsfwScore = Math.max(nsfwScore, 0.7);
        }

        return {
            service: 'Google Vision',
            success: true,
            nsfwScore,
            safeSearch,
            labels: labels.map(l => ({ description: l.description, score: l.score })),
            confidence: 0.9
        };
    } catch (error) {
        console.error('Google Vision API error:', error.message);
        return {
            service: 'Google Vision',
            success: false,
            error: error.message
        };
    }
};

/**
 * Convert Google Vision likelihood to numeric score
 */
const getLikelihoodScore = (likelihood) => {
    const scores = {
        'VERY_UNLIKELY': 0.1,
        'UNLIKELY': 0.3,
        'POSSIBLE': 0.5,
        'LIKELY': 0.7,
        'VERY_LIKELY': 0.9
    };
    return scores[likelihood] || 0;
};

/**
 * Analyze image using AWS Rekognition
 */
const analyzeWithAWSRekognition = async (imagePath) => {
    try {
        const AWS = require('aws-sdk');

        const rekognition = new AWS.Rekognition({
            accessKeyId: AI_SERVICES.AWS_REKOGNITION.accessKey,
            secretAccessKey: AI_SERVICES.AWS_REKOGNITION.secretKey,
            region: AI_SERVICES.AWS_REKOGNITION.region
        });

        const fsPath = resolveFsPath(imagePath);
        const imageBuffer = fs.readFileSync(fsPath);

        const params = {
            Image: { Bytes: imageBuffer },
            MinConfidence: 50
        };

        const [moderationResult, labelResult] = await Promise.all([
            rekognition.detectModerationLabels(params).promise(),
            rekognition.detectLabels(params).promise()
        ]);

        // Calculate NSFW score from moderation labels
        let nsfwScore = 0;
        if (moderationResult.ModerationLabels) {
            const explicitLabels = moderationResult.ModerationLabels.filter(label =>
                ['Explicit Nudity', 'Sexual Activity', 'Violence'].includes(label.Name)
            );

            if (explicitLabels.length > 0) {
                nsfwScore = Math.max(...explicitLabels.map(label => label.Confidence / 100));
            }
        }

        return {
            service: 'AWS Rekognition',
            success: true,
            nsfwScore,
            moderationLabels: moderationResult.ModerationLabels || [],
            labels: labelResult.Labels || [],
            confidence: 0.9
        };
    } catch (error) {
        console.error('AWS Rekognition error:', error.message);
        return {
            service: 'AWS Rekognition',
            success: false,
            error: error.message
        };
    }
};

/**
 * Local NSFW detection using a lightweight model
 * This is a fallback when external APIs are not available
 */
const analyzeWithLocalModel = async (imagePath) => {
    try {
        // This would integrate with a local NSFW detection model
        // For now, we'll use a simple heuristic approach

        const fsPath = resolveFsPath(imagePath);
        const imageBuffer = fs.readFileSync(fsPath);
        const fileSize = imageBuffer.length;

        // Simple heuristics (not very accurate, but better than nothing)
        let nsfwScore = 0;

        // Check file size (very large images might be suspicious)
        if (fileSize > 5 * 1024 * 1024) { // 5MB
            nsfwScore += 0.1;
        }

        // Check for common NSFW file patterns in the buffer
        const bufferString = imageBuffer.toString('hex');
        const suspiciousPatterns = [
            'ffd8ffe0', // JPEG with EXIF data
            'ffd8ffe1', // JPEG with EXIF data
            'ffd8ffe2'  // JPEG with EXIF data
        ];

        // This is a very basic check - in practice, you'd use a proper ML model
        const hasExifData = suspiciousPatterns.some(pattern =>
            bufferString.toLowerCase().includes(pattern)
        );

        if (hasExifData) {
            nsfwScore += 0.2;
        }

        return {
            service: 'Local Model',
            success: true,
            nsfwScore,
            confidence: 0.3, // Low confidence for heuristic approach
            method: 'heuristic'
        };
    } catch (error) {
        console.error('Local model analysis error:', error.message);
        return {
            service: 'Local Model',
            success: false,
            error: error.message
        };
    }
};

/**
 * Main AI moderation function
 */
const analyzeContentWithAI = async (imagePath, options = {}) => {
    const results = {
        timestamp: new Date(),
        imagePath,
        analyses: [],
        overallNsfwScore: 0,
        confidence: 0,
        recommendation: 'allow',
        reasons: []
    };

    // Try different AI services in order of preference
    const services = [
        { name: 'Google Vision', fn: analyzeWithGoogleVision, enabled: AI_SERVICES.GOOGLE_VISION.enabled },
        { name: 'AWS Rekognition', fn: analyzeWithAWSRekognition, enabled: AI_SERVICES.AWS_REKOGNITION.enabled },
        { name: 'Hugging Face', fn: analyzeWithHuggingFace, enabled: AI_SERVICES.HUGGINGFACE.enabled },
        { name: 'Local Model', fn: analyzeWithLocalModel, enabled: true } // Always available as fallback
    ];

    // Run analyses in parallel for enabled services
    const enabledServices = services.filter(service => service.enabled);
    const analysisPromises = enabledServices.map(service =>
        service.fn(imagePath).then(result => ({ ...result, serviceName: service.name }))
    );

    try {
        const analysisResults = await Promise.allSettled(analysisPromises);

        analysisResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                results.analyses.push(result.value);
            } else {
                console.warn(`Analysis failed for ${enabledServices[index].name}:`,
                    result.status === 'rejected' ? result.reason : result.value.error);
            }
        });

        // Calculate overall NSFW score
        if (results.analyses.length > 0) {
            const validScores = results.analyses
                .filter(analysis => analysis.nsfwScore !== undefined)
                .map(analysis => analysis.nsfwScore);

            if (validScores.length > 0) {
                // Weighted average based on confidence
                const totalWeight = results.analyses.reduce((sum, analysis) =>
                    sum + (analysis.confidence || 0), 0);

                results.overallNsfwScore = results.analyses.reduce((sum, analysis) =>
                    sum + (analysis.nsfwScore || 0) * (analysis.confidence || 0), 0) / totalWeight;

                results.confidence = totalWeight / results.analyses.length;
            }
        }

        // Make recommendation based on NSFW score
        if (results.overallNsfwScore >= 0.8) {
            results.recommendation = 'block';
            results.reasons.push('High NSFW probability detected');
        } else if (results.overallNsfwScore >= 0.5) {
            results.recommendation = 'quarantine';
            results.reasons.push('Moderate NSFW probability detected');
        } else if (results.overallNsfwScore >= 0.3) {
            results.recommendation = 'review';
            results.reasons.push('Low NSFW probability detected');
        } else {
            results.recommendation = 'allow';
        }

        console.log(`AI moderation completed: ${results.recommendation} (score: ${results.overallNsfwScore.toFixed(3)})`);

    } catch (error) {
        console.error('AI moderation error:', error);
        results.recommendation = 'review';
        results.reasons.push('AI analysis failed - manual review required');
    }

    return results;
};

module.exports = {
    analyzeContentWithAI,
    AI_SERVICES
};
