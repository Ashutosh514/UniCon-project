const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET; // Ensure this matches your .env or actual secret
console.debug('auth.controller: JWT_SECRET present=', !!JWT_SECRET);
// Optional environment-configured single admin credentials
const ADMIN_ID = process.env.ADMIN_ID; // recommended: a fixed string or ObjectId stored in .env
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

// User registration
const registerUser = async (req, res) => {
    try {
        if (!JWT_SECRET) {
            console.error('registerUser: JWT_SECRET is not defined at runtime');
            return res.status(500).json({ message: 'Server configuration error: JWT secret not set' });
        }
        const { fullName, email, password, role } = req.body;

        // Input validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Role validation
        if (role && !['student', 'teacher'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified' });
        }

        // Prevent creating additional admin accounts via registration
        if (role === 'admin' || (ADMIN_EMAIL && email === ADMIN_EMAIL)) {
            return res.status(403).json({ message: 'Admin account must be configured via environment. Registration denied.' });
        }

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        user = new User({
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: role || 'student',
        });

        await user.save();

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '10h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

// User login
const loginUser = async (req, res) => {
    try {
        if (!JWT_SECRET) {
            console.error('loginUser: JWT_SECRET is not defined at runtime');
            return res.status(500).json({ message: 'Server configuration error: JWT secret not set' });
        }
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // If env admin credentials are set and match, issue admin token without DB lookup
        if (ADMIN_EMAIL && ADMIN_PASSWORD && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            const adminId = ADMIN_ID || 'admin';
            const token = jwt.sign({ userId: adminId, role: 'admin' }, JWT_SECRET, { expiresIn: '10h' });
            return res.status(200).json({
                message: 'Logged in as admin',
                token,
                user: {
                    id: adminId,
                    fullName: ADMIN_NAME,
                    email: ADMIN_EMAIL,
                    role: 'admin'
                }
            });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if user has a password (not a Google-only user)
        if (!user.password) {
            return res.status(400).json({ message: 'This account is linked to Google. Please use Google Sign-In.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '10h' }
        );

        res.status(200).json({
            message: 'Logged in successfully',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

// Google Sign-In callback (we accept id_token from client and validate it)
const { OAuth2Client } = require('google-auth-library');

const googleCallback = async (req, res) => {
    try {
        const idToken = req.query.id_token || req.body.id_token;
        if (!idToken) return res.status(400).json({ message: 'id_token required' });

        // determine client id from env (allow VITE_GSI_CLIENT_ID for convenience)
        const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GSI_CLIENT_ID;
        if (!GOOGLE_CLIENT_ID) {
            console.error('Google client id not configured in backend env (GOOGLE_CLIENT_ID or VITE_GSI_CLIENT_ID)');
            return res.status(500).json({ message: 'Server misconfiguration: Google client id missing' });
        }

        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        let ticket;
        try {
            ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        } catch (verifyErr) {
            console.error('Error verifying Google id_token:', verifyErr);
            return res.status(401).json({ message: 'Invalid Google id_token', error: verifyErr.message || verifyErr });
        }

        const payload = ticket.getPayload();
        // payload contains email_verified, email, name, picture, sub (google id)
        if (!payload || !payload.email_verified) return res.status(403).json({ message: 'Google account email not verified' });

        const email = payload.email || '';
        if (!email.endsWith('@gmail.com')) {
            return res.status(403).json({ message: 'Only Gmail accounts are allowed to register/login' });
        }

        // Find or create user
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                fullName: payload.name || 'Google User',
                email,
                googleId: payload.sub,
                role: 'student',
            });
            await user.save();
        } else if (!user.googleId) {
            // Update existing user with Google ID if they don't have one
            user.googleId = payload.sub;
            await user.save();
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '10h' });

        return res.status(200).json({
            message: 'Logged in with Google',
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('Google callback unexpected error', err);
        return res.status(500).json({ message: 'Error validating Google token', error: err.message || err });
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleCallback,
};
