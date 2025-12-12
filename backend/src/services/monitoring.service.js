/**
 * Content Moderation Monitoring & Alerting Service
 * Layer 6: Real-time monitoring and alerting for suspicious uploads
 */

const nodemailer = require('nodemailer');
const ContentReview = require('../models/ContentReview');
const User = require('../models/User');

// Email configuration
let emailTransporter = null;
try {
    const mailUser = process.env.ADMIN_EMAIL;
    const mailPass = process.env.ADMIN_EMAIL_PASSWORD || process.env.ADMIN_PASSWORD;
    if (mailUser && mailPass) {
        emailTransporter = nodemailer.createTransport({
            service: 'gmail', // or your preferred email service
            auth: {
                user: mailUser,
                pass: mailPass
            }
        });
    } else {
        console.warn('Email transporter not configured: ADMIN_EMAIL or ADMIN_EMAIL_PASSWORD / ADMIN_PASSWORD missing');
    }
} catch (e) {
    console.error('Failed to configure email transporter:', e && e.stack ? e.stack : e);
    emailTransporter = null;
}

// Alert thresholds
const ALERT_THRESHOLDS = {
    HIGH_RISK_UPLOADS: 5, // Alert if 5+ high-risk uploads in 1 hour
    NSFW_DETECTIONS: 3,   // Alert if 3+ NSFW detections in 1 hour
    QUARANTINE_QUEUE: 10, // Alert if 10+ items in quarantine
    APPEAL_BACKLOG: 5     // Alert if 5+ pending appeals
};

// Monitoring intervals (in milliseconds)
const MONITORING_INTERVALS = {
    REAL_TIME: 5 * 60 * 1000,    // 5 minutes
    HOURLY: 60 * 60 * 1000,      // 1 hour
    DAILY: 24 * 60 * 60 * 1000   // 24 hours
};

/**
 * Send email alert to administrators
 */
const sendEmailAlert = async (subject, message, priority = 'medium') => {
    try {
        const adminEmails = await User.find({ role: 'admin' }).select('email');

        if (adminEmails.length === 0) {
            console.warn('No admin emails found for alerting');
            return;
        }

        const emailList = adminEmails.map(admin => admin.email).join(', ');

        const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: emailList,
            subject: `[${priority.toUpperCase()}] UniCon Content Moderation Alert: ${subject}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${priority === 'high' ? '#ff4444' : priority === 'medium' ? '#ffaa00' : '#00aa00'}; color: white; padding: 20px; text-align: center;">
            <h1>Content Moderation Alert</h1>
            <h2>${subject}</h2>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>${message}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
          </div>
          <div style="padding: 20px; background-color: #e9e9e9; text-align: center;">
            <p>Please review the content moderation dashboard for more details.</p>
            <a href="${process.env.FRONTEND_URL}/admin/moderation" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
          </div>
        </div>
      `
        };

        if (!emailTransporter) {
            console.warn('Skipping email alert - transporter not configured');
            return;
        }

        await emailTransporter.sendMail(mailOptions);
        console.log(`Alert email sent: ${subject}`);

    } catch (error) {
        console.error('Failed to send email alert:', error);
    }
};

/**
 * Send Slack alert (if configured)
 */
const sendSlackAlert = async (message, priority = 'medium') => {
    try {
        if (!process.env.SLACK_WEBHOOK_URL) {
            return; // Slack not configured
        }

        const axios = require('axios');

        const payload = {
            text: `🚨 Content Moderation Alert (${priority.toUpperCase()})`,
            attachments: [{
                color: priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'good',
                fields: [{
                    title: 'Message',
                    value: message,
                    short: false
                }, {
                    title: 'Time',
                    value: new Date().toLocaleString(),
                    short: true
                }]
            }]
        };

        await axios.post(process.env.SLACK_WEBHOOK_URL, payload);
        console.log('Slack alert sent');

    } catch (error) {
        console.error('Failed to send Slack alert:', error);
    }
};

/**
 * Check for high-risk upload patterns
 */
const checkHighRiskPatterns = async () => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Count high-risk uploads in the last hour
        const highRiskCount = await ContentReview.countDocuments({
            'moderationResults.riskAssessment.overallRisk': 'high',
            createdAt: { $gte: oneHourAgo }
        });

        if (highRiskCount >= ALERT_THRESHOLDS.HIGH_RISK_UPLOADS) {
            const message = `${highRiskCount} high-risk content uploads detected in the last hour. Immediate review recommended.`;

            await sendEmailAlert('High-Risk Upload Spike', message, 'high');
            await sendSlackAlert(message, 'high');
        }

        // Check for NSFW detections
        const nsfwCount = await ContentReview.countDocuments({
            'moderationResults.aiAnalysis.overallNsfwScore': { $gte: 0.8 },
            createdAt: { $gte: oneHourAgo }
        });

        if (nsfwCount >= ALERT_THRESHOLDS.NSFW_DETECTIONS) {
            const message = `${nsfwCount} NSFW content detections in the last hour. AI confidence levels high.`;

            await sendEmailAlert('NSFW Detection Spike', message, 'high');
            await sendSlackAlert(message, 'high');
        }

    } catch (error) {
        console.error('Error checking high-risk patterns:', error);
    }
};

/**
 * Check quarantine queue size
 */
const checkQuarantineQueue = async () => {
    try {
        const quarantineCount = await ContentReview.countDocuments({
            status: { $in: ['pending', 'quarantined'] }
        });

        if (quarantineCount >= ALERT_THRESHOLDS.QUARANTINE_QUEUE) {
            const message = `Quarantine queue has ${quarantineCount} items pending review. Consider increasing review capacity.`;

            await sendEmailAlert('Quarantine Queue Backlog', message, 'medium');
            await sendSlackAlert(message, 'medium');
        }

    } catch (error) {
        console.error('Error checking quarantine queue:', error);
    }
};

/**
 * Check appeal backlog
 */
const checkAppealBacklog = async () => {
    try {
        const appealCount = await ContentReview.countDocuments({
            'appeal.appealStatus': 'pending'
        });

        if (appealCount >= ALERT_THRESHOLDS.APPEAL_BACKLOG) {
            const message = `${appealCount} content appeals pending review. Users may be waiting for responses.`;

            await sendEmailAlert('Appeal Backlog', message, 'medium');
            await sendSlackAlert(message, 'medium');
        }

    } catch (error) {
        console.error('Error checking appeal backlog:', error);
    }
};

/**
 * Generate daily moderation report
 */
const generateDailyReport = async () => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await ContentReview.aggregate([
            {
                $match: {
                    createdAt: { $gte: yesterday, $lt: today }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const riskStats = await ContentReview.aggregate([
            {
                $match: {
                    createdAt: { $gte: yesterday, $lt: today }
                }
            },
            {
                $group: {
                    _id: '$moderationResults.riskAssessment.overallRisk',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalUploads = stats.reduce((sum, stat) => sum + stat.count, 0);
        const approvedCount = stats.find(s => s._id === 'approved')?.count || 0;
        const rejectedCount = stats.find(s => s._id === 'rejected')?.count || 0;
        const quarantinedCount = stats.find(s => s._id === 'quarantined')?.count || 0;

        const report = `
      <h2>Daily Content Moderation Report - ${yesterday.toDateString()}</h2>
      <h3>Summary</h3>
      <ul>
        <li>Total uploads: ${totalUploads}</li>
        <li>Approved: ${approvedCount}</li>
        <li>Rejected: ${rejectedCount}</li>
        <li>Quarantined: ${quarantinedCount}</li>
      </ul>
      
      <h3>Risk Distribution</h3>
      <ul>
        ${riskStats.map(stat => `<li>${stat._id}: ${stat.count}</li>`).join('')}
      </ul>
      
      <h3>Status Distribution</h3>
      <ul>
        ${stats.map(stat => `<li>${stat._id}: ${stat.count}</li>`).join('')}
      </ul>
    `;

        await sendEmailAlert('Daily Moderation Report', report, 'low');

    } catch (error) {
        console.error('Error generating daily report:', error);
    }
};

/**
 * Monitor user behavior patterns
 */
const monitorUserBehavior = async () => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Find users with multiple rejected uploads
        const suspiciousUsers = await ContentReview.aggregate([
            {
                $match: {
                    status: 'rejected',
                    createdAt: { $gte: oneHourAgo }
                }
            },
            {
                $group: {
                    _id: '$uploadedBy',
                    rejectedCount: { $sum: 1 },
                    lastUpload: { $max: '$createdAt' }
                }
            },
            {
                $match: {
                    rejectedCount: { $gte: 3 } // 3+ rejections in 1 hour
                }
            }
        ]);

        for (const user of suspiciousUsers) {
            const userInfo = await User.findById(user._id).select('fullName email');

            if (userInfo) {
                const message = `User ${userInfo.fullName} (${userInfo.email}) has ${user.rejectedCount} rejected uploads in the last hour. Consider reviewing their account.`;

                await sendEmailAlert('Suspicious User Activity', message, 'medium');
                await sendSlackAlert(message, 'medium');
            }
        }

    } catch (error) {
        console.error('Error monitoring user behavior:', error);
    }
};

/**
 * Start monitoring service
 */
const startMonitoring = () => {

    // Real-time monitoring (every 5 minutes)
    setInterval(checkHighRiskPatterns, MONITORING_INTERVALS.REAL_TIME);
    setInterval(checkQuarantineQueue, MONITORING_INTERVALS.REAL_TIME);
    setInterval(checkAppealBacklog, MONITORING_INTERVALS.REAL_TIME);
    setInterval(monitorUserBehavior, MONITORING_INTERVALS.REAL_TIME);

    // Daily report (every 24 hours)
    setInterval(generateDailyReport, MONITORING_INTERVALS.DAILY);

};

/**
 * Stop monitoring service
 */
const stopMonitoring = () => {
    console.log('Stopping content moderation monitoring service...');
    // In a real implementation, you'd store the interval IDs and clear them
    console.log('Content moderation monitoring service stopped');
};

module.exports = {
    startMonitoring,
    stopMonitoring,
    sendEmailAlert,
    sendSlackAlert,
    checkHighRiskPatterns,
    checkQuarantineQueue,
    checkAppealBacklog,
    generateDailyReport,
    monitorUserBehavior
};
