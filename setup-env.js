#!/usr/bin/env node

/**
 * Quick setup script for UniCon Authentication
 * Run this with: node setup-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 UniCon Authentication Setup Helper\n');

// Check if .env files exist
const frontendEnvPath = path.join(__dirname, '.env');
const backendEnvPath = path.join(__dirname, 'backend', '.env');

console.log('📋 Environment Files Status:');
console.log(`Frontend .env: ${fs.existsSync(frontendEnvPath) ? '✅ Exists' : '❌ Missing'}`);
console.log(`Backend .env: ${fs.existsSync(backendEnvPath) ? '✅ Exists' : '❌ Missing'}\n`);

// Frontend .env template
const frontendEnvTemplate = `# Google OAuth Configuration for Frontend
VITE_GSI_CLIENT_ID=your-google-client-id-here

# Backend API URL
VITE_API_URL=http://localhost:5000`;

// Backend .env template
const backendEnvTemplate = `# Database Configuration
MONGODB_URI=mongodb://localhost:27017/unicon-project

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin Configuration (Optional)
ADMIN_ID=admin123
ADMIN_EMAIL=admin@unicon.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
VITE_GSI_CLIENT_ID=your-google-client-id-here

# Cloudinary Configuration (Optional - for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Server Configuration
PORT=5000
NODE_ENV=development`;

// Create .env files if they don't exist
if (!fs.existsSync(frontendEnvPath)) {
    fs.writeFileSync(frontendEnvPath, frontendEnvTemplate);
    console.log('✅ Created frontend .env file');
} else {
    console.log('ℹ️  Frontend .env already exists');
}

if (!fs.existsSync(backendEnvPath)) {
    fs.writeFileSync(backendEnvPath, backendEnvTemplate);
    console.log('✅ Created backend .env file');
} else {
    console.log('ℹ️  Backend .env already exists');
}

console.log('\n🚀 Next Steps:');
console.log('1. Get your Google Client ID from Google Cloud Console');
console.log('2. Add the following origins to your Google OAuth client:');
console.log('   - http://localhost:5173');
console.log('   - http://localhost:3000');
console.log('   - http://127.0.0.1:5173');
console.log('   - http://127.0.0.1:3000');
console.log('3. Update the VITE_GSI_CLIENT_ID in both .env files');
console.log('4. Start your servers:');
console.log('   - Backend: cd backend && npm run dev');
console.log('   - Frontend: npm run dev');
console.log('\n📖 For detailed instructions, see AUTHENTICATION_SETUP.md');

