# Secure Authentication System Setup Guide

This guide will help you set up a secure login system with both email/password and Google Sign-In authentication for your UniCon project.

## 🔧 Backend Setup

### 1. Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Configuration
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
NODE_ENV=development
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set the application type to "Web application"
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (Vite default port)
   - `http://localhost:3000` (alternative port)
   - `http://127.0.0.1:5173` (alternative localhost)
   - `http://127.0.0.1:3000` (alternative localhost)
7. Copy the Client ID and add it to your `.env` file

**⚠️ Important**: Make sure to add ALL the origins listed above to avoid the "origin not allowed" error.

### 3. Install Dependencies

The following packages are already included in your `package.json`:
- `google-auth-library` - For Google OAuth verification
- `bcryptjs` - For password hashing
- `jsonwebtoken` - For JWT token management
- `passport` & `passport-google-oauth20` - For OAuth strategies

## 🎨 Frontend Setup

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
# Google OAuth Configuration for Frontend
VITE_GSI_CLIENT_ID=your-google-client-id-here

# Backend API URL
VITE_API_URL=http://localhost:5000
```

### 2. Google Sign-In Script

The Google Sign-In script is automatically loaded in the `SignupLogin.jsx` component. Make sure your `VITE_GSI_CLIENT_ID` is set correctly.

## 🚀 Running the Application

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend

```bash
npm install
npm run dev
```

## 🔐 Authentication Features

### Email & Password Authentication
- ✅ User registration with validation
- ✅ Secure password hashing with bcrypt
- ✅ Email format validation
- ✅ Password strength indicator
- ✅ Role-based access (student, teacher, admin)
- ✅ JWT token authentication
- ✅ Automatic token expiration handling

### Google Sign-In Authentication
- ✅ OAuth 2.0 integration
- ✅ Automatic user creation for new Google users
- ✅ Account linking for existing users
- ✅ Gmail-only restriction (configurable)
- ✅ Secure token verification

### Security Features
- ✅ Password strength validation
- ✅ Input sanitization
- ✅ JWT token expiration (10 hours)
- ✅ CORS protection
- ✅ Environment-based configuration
- ✅ Admin account protection

## 🛠️ API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /register` - User registration
- `POST /login` - User login
- `POST /google/callback` - Google OAuth callback
- `GET /google/callback` - Google OAuth callback (alternative)

### Protected Routes

All skill-related routes require authentication:
- `GET /api/skills` - Get all skills (public)
- `POST /api/skills` - Create skill (authenticated)
- `DELETE /api/skills/:id` - Delete skill (authenticated)

## 🔍 Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check if MongoDB is running
   - Verify JWT_SECRET is set in environment
   - Check if all required environment variables are set

2. **Google Sign-In Not Working**
   - Verify `VITE_GSI_CLIENT_ID` is set correctly
   - Check if the domain is authorized in Google Console
   - Ensure the Google+ API is enabled

3. **Authentication Token Issues**
   - Check if JWT_SECRET is consistent between frontend and backend
   - Verify token expiration time
   - Clear localStorage and try again

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your backend `.env` file.

## 📝 User Roles

- **Student**: Can create and manage their own skills
- **Teacher**: Same as student (can be extended for additional features)
- **Admin**: Can delete any skill and manage the system

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` files to version control
2. **JWT Secret**: Use a strong, random secret key in production
3. **Password Policy**: Enforce minimum 6 characters (configurable)
4. **HTTPS**: Use HTTPS in production
5. **CORS**: Configure CORS properly for your domain
6. **Rate Limiting**: Consider adding rate limiting for auth endpoints

## 🚀 Production Deployment

1. Set strong, unique values for all environment variables
2. Use a production MongoDB instance
3. Configure proper CORS origins
4. Set up HTTPS
5. Consider using a reverse proxy (nginx)
6. Monitor authentication logs

## 📞 Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check if MongoDB is running and accessible

---

**Note**: This authentication system is designed for development and small-scale production use. For enterprise applications, consider additional security measures like rate limiting, account lockout policies, and more sophisticated session management.
