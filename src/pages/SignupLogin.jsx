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
  const { login } = useAuth();

  const GSI_CLIENT_ID = import.meta.env.VITE_GSI_CLIENT_ID || '';

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

  const getPasswordStrengthColor = (s) =>
    s <= 2 ? "bg-red-500" : s <= 4 ? "bg-yellow-500" : "bg-green-500";

  const getPasswordStrengthText = (s) =>
    s <= 2 ? "Weak" : s <= 4 ? "Medium" : "Strong";

  useEffect(() => {
    const id = "google-identity-script";
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = id;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.google && GSI_CLIENT_ID) {
          window.google.accounts.id.initialize({
            client_id: GSI_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
          });

          if (document.getElementById("google-signin-button")) {
            window.google.accounts.id.renderButton(
              document.getElementById("google-signin-button"),
              { theme: "outline", size: "large", width: "240" }
            );
          }
        }
      };
    }
  }, []);

  // 🔥 GOOGLE LOGIN UPDATE — now uses full backend URL
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/google/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Google login failed");

      login(data.token, data.user.id, data.user.fullName, data.user.role);
      navigate(from, { replace: true });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 LOGIN & SIGNUP UPDATE — now uses full backend URL
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    const endpoint = isLogin
      ? `${API}/api/auth/login`
      : `${API}/api/auth/register`;

    const body = isLogin
      ? { email, password }
      : { fullName, email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      login(data.token, data.user.id, data.user.fullName, data.user.role);
      navigate(from, { replace: true });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-transparent p-8 rounded-xl shadow-md w-full max-w-md text-white">
        
        <img src="unicon.png" className="mx-auto h-24" />

        <h2 className="text-2xl font-bold mb-4 text-center">
          {isLogin ? "Login to your Account" : "Sign up for your Account"}
        </h2>

        {error && (
          <div className="bg-red-800 p-3 mb-4 rounded text-center">{error}</div>
        )}

        {/* FORM START */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              className="input"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}

          <input
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="input"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordStrength(calculatePasswordStrength(e.target.value));
            }}
          />

          <button className="btn-primary w-full mt-2" disabled={loading}>
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        {/* Google Sign In */}
        <div className="mt-4 flex justify-center">
          <div id="google-signin-button"></div>
        </div>

        {/* Switch forms */}
        <p className="text-center mt-4 text-gray-300">
          {isLogin ? (
            <>
              Don’t have an account?{" "}
              <button
                className="text-blue-500 underline"
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="text-blue-500 underline"
                onClick={() => setIsLogin(true)}
              >
                Login
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
