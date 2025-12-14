import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; 
import { useEffect } from 'react';

const API = "https://unicon-project-2.onrender.com";

export default function SignupLogin() {
  const [role, setRole] = useState('student');
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const { login } = useAuth(); // Use the login function from AuthContext

  // Google Identity Services client ID (Vite env: VITE_GSI_CLIENT_ID)
  const GSI_CLIENT_ID = import.meta.env.VITE_GSI_CLIENT_ID || '';

  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthColor = (strength) => {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (strength) => {
    if (strength <= 2) return 'Weak';
    if (strength <= 4) return 'Medium';
    return 'Strong';
  };

  useEffect(() => {
    // Debug: show runtime env value for easier troubleshooting
    try {
      // eslint-disable-next-line no-console
      console.debug('VITE_GSI_CLIENT_ID=', import.meta.env.VITE_GSI_CLIENT_ID);
      console.debug('Current origin:', window.location.origin);
      console.debug('Current hostname:', window.location.hostname);
      console.debug('Current port:', window.location.port);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug('import.meta.env not available', e);
    }
    // Load Google's Identity Services script dynamically
    const id = 'google-identity-script';
    if (!document.getElementById(id)) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.id = id;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      script.onload = () => {
        // Debug: indicate the Google script has loaded
        // eslint-disable-next-line no-console
        console.debug('Google Identity script loaded, window.google=', !!window.google);
        if (window.google && GSI_CLIENT_ID) {
          window.google.accounts.id.initialize({
            client_id: GSI_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
          });
          // Render the button into our placeholder
          if (document.getElementById('google-signin-button')) {
            try {
              window.google.accounts.id.renderButton(
                document.getElementById('google-signin-button'),
                { theme: 'outline', size: 'large', width: '240' }
              );
            } catch (err) {
              console.warn('Google renderButton not available yet', err);
            }
          }
        }
      };
    } else {
      if (window.google && GSI_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GSI_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
        });
        if (document.getElementById('google-signin-button')) {
          try {
            window.google.accounts.id.renderButton(
              document.getElementById('google-signin-button'),
              { theme: 'outline', size: 'large', width: '240' }
            );
          } catch (err) {
            console.warn('Google renderButton not available yet', err);
          }
        }
      }
    }
  }, []);

  // Handle credential response from Google Identity Services
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) return;
    setLoading(true);
    try {
      const res = await fetch('${API}/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential }),
      });

      let data = null;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        console.error('Failed to parse JSON from google callback response:', text);
        throw new Error(`Invalid JSON response from server (status ${res.status})`);
      }

      if (!res.ok) throw new Error(data?.message || `Google login failed (status ${res.status})`);

      // Login via AuthContext
      login(data.token, data.user.id, data.user.fullName, data.user.role);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Client-side validation
    if (!email || !password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (!isLogin && !fullName) {
      setError('Full name is required for registration');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please provide a valid email address');
      setLoading(false);
      return;
    }

    const authEndpoint = isLogin ? '${API}/api/auth/login' : '${API}/api/auth/register';
    const body = isLogin
      ? { email, password }
      : { fullName, email, password, role };

    try {
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Call the login function from AuthContext to update global state and localStorage
      login(data.token, data.user.id, data.user.fullName, data.user.role);

      // Redirect back to the page the user originally wanted to visit, or root
      navigate(from, { replace: true });

    } catch (err) {
      console.error('Authentication Error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-transparent p-8 rounded-xl shadow-md w-full max-w-md text-white">
        <div className='h-30 w-30 mx-auto mt-1'>
          <img src="unicon.png" alt="UniCon Logo" className="mx-auto" />
        </div>
        <h2 className="text-2xl font-bold mb-4 text-center">{isLogin ? 'Login to your Account' : 'Sign up for your Account'}</h2>

        {/* Role Selection Buttons */}
        <div className="flex flex-wrap gap-1 justify-center mb-4">
          <button
            type="button"
            className={`px-4 py-2 rounded-l-lg rounded-r-lg font-semibold transition-colors duration-200 ${role === 'student' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            onClick={() => setRole('student')}
            disabled={loading}
          >
            Student
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-l-lg rounded-r-lg font-semibold transition-colors duration-200 ${role === 'teacher' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            onClick={() => setRole('teacher')}
            disabled={loading}
          >
            Teacher
          </button>
          {isLogin && (
            <button
              type="button"
              className={`px-4 py-2 rounded-l-lg rounded-r-lg font-semibold transition-colors duration-200 ${role === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => setRole('admin')}
              disabled={loading}
            >
              Admin
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-800 text-white text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full mb-3 px-3 py-2 border rounded bg-gray-700 border-none text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full mb-3 px-3 py-2 border rounded bg-gray-700 border-none text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <div className="relative mb-3">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-3 py-2 pr-10 border rounded bg-gray-700 border-none text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordStrength(calculatePasswordStrength(e.target.value));
              }}
              required
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <span className="text-gray-400 text-sm">
                {showPassword ? 'Hide' : 'Show'}
              </span>
            </button>
          </div>
          {!isLogin && password && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Password strength:</span>
                <span className={getPasswordStrengthColor(passwordStrength).replace('bg-', 'text-')}>
                  {getPasswordStrengthText(passwordStrength)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                  style={{ width: `${(passwordStrength / 6) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isLogin ? 'Logging In...' : 'Signing Up...'}
              </>
            ) : (
              isLogin ? 'Login' : 'Sign Up'
            )}
          </button>
        </form>
        <div className="mt-4 text-center">
          {!GSI_CLIENT_ID ? (
            <div className="text-sm text-yellow-300">Google Sign-In not configured. Set `VITE_GSI_CLIENT_ID` in your `.env`.</div>
          ) : (
            <div className="flex justify-center mt-3">
              <div id="google-signin-button" />
            </div>
          )}
        </div>
        <div className="mt-4 text-center text-gray-300">
          {isLogin ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                className="text-blue-600 underline hover:text-blue-400 transition"
                onClick={() => { setIsLogin(false); setError(null); setRole('student'); }}
                disabled={loading}
              >
                Sign Up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                className="text-blue-600 underline hover:text-blue-400 transition"
                onClick={() => { setIsLogin(true); setError(null); }}
                disabled={loading}
              >
                Login
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
