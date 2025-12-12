const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    // Check if the secret key is defined to prevent server errors
    if (!JWT_SECRET) {
        return res.status(500).json({ message: 'Server configuration error' });
    }

    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    } catch (err) {
        // Log the error to the console for debugging
        console.error('Token verification failed:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
const requireAdmin = (req, res, next) => {
    if (!req.userRole) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Admin role required' });
    }
    next();
};

module.exports = {
    authMiddleware,
    requireAdmin
};
