const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
// Load environment variables immediately so modules required below can read them at load time
const envResult = dotenv.config();
// If dotenv didn't load variables (e.g. started from backend folder), try repo root .env
if (!process.env.JWT_SECRET) {
    const repoRootEnv = path.join(__dirname, '..', '..', '.env');
    try {
        const alt = dotenv.config({ path: repoRootEnv });
        if (alt.parsed) {
            const secret = process.env.JWT_SECRET || '';
            const masked = secret.length > 8 ? `${secret.slice(0, 4)}...${secret.slice(-4)}` : (secret ? '****' : '');
            console.log('Loaded .env from repo root:', repoRootEnv, 'JWT_SECRET present (masked):', !!secret ? masked : false);
        } else {
            console.warn('Could not load .env from repo root:', repoRootEnv);
        }
    } catch (e) {
        console.warn('Error loading .env from repo root:', e.message || e);
    }
} else {
    const secret = process.env.JWT_SECRET;
    const masked = secret.length > 8 ? `${secret.slice(0, 4)}...${secret.slice(-4)}` : '****';
    console.log('JWT_SECRET present (masked):', masked);
}
const connectDB = require('./config/db.config');
const skillsRoutes = require('./routes/skills.routes');
const lostItemsRoutes = require('./routes/lostItems.routes');
const authRoutes = require('./routes/auth.routes');
const authGoogleRoutes = require('./routes/auth.google.routes');
const resourcesRoutes = require('./routes/resources.routes');
const questionsRoutes = require('./routes/questions.routes');
const statsRoutes = require('./routes/stats.routes');
const contentModerationRoutes = require('./routes/contentModeration.routes');
const postReviewRoutes = require('./routes/postReview.routes');
const { startMonitoring } = require('./services/monitoring.service');
const cors = require('cors');

// ✅ Create app first
const app = express();

// ✅ Setup CORS properly after app is defined
app.use(cors({
    origin: "*",// Adjust this to your frontend URL
    allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

// ✅ Load environment variables
// Load environment variables as early as possible so other modules can read them.
// Try default first (process.cwd()), then fall back to repository root when backend is started from its own folder.
if (!process.env.JWT_SECRET) {
    const repoRootEnv = path.join(__dirname, '..', '..', '.env');
    const altResult = dotenv.config({ path: repoRootEnv });
    if (altResult.parsed) {
        console.log('Loaded .env from repo root:', repoRootEnv);
    } else {
        console.warn('Could not find .env at repo root. Using default environment.');
    }
} else {
    console.log('Loaded .env from default location; JWT_SECRET present=', !!process.env.JWT_SECRET);
}

// ✅ Connect to MongoDB
connectDB();

// ✅ JSON middleware
app.use(express.json());

// Serve static files from uploads directory
const uploadsPath = path.join(__dirname, '..', 'uploads');
console.log('Static files will be served from:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));


// ✅ Routes
app.get('/', (req, res) => {
    res.send('Welcome to the Skill Exchange Backend API!');
});
// Simple health check for frontend to probe via Vite proxy
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
});
app.use('/api/skills', skillsRoutes);
app.use('/api/lostitems', lostItemsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/google', authGoogleRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/moderation', contentModerationRoutes);
app.use('/api/postreviews', postReviewRoutes);

// ✅ Generic error handling middleware
// This will catch any uncaught errors and respond with JSON.
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Start content moderation monitoring
    startMonitoring();
});
