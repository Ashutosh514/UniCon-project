import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// Create the Auth Context
const AuthContext = createContext(null);

// Custom hook to use the Auth Context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState(''); // Also store userId in context

  // Effect to initialize state from localStorage on mount
  useEffect(() => {
    let expiryTimer = null;

    // Helper: parse JWT payload safely
    const parseJwt = (token) => {
      try {
        const payload = token.split('.')[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodeURIComponent(escape(decoded)));
      } catch (err) {
        return null;
      }
    };

    const isTokenExpired = (token) => {
      const payload = parseJwt(token);
      if (!payload || !payload.exp) return true;
      // exp is in seconds
      const now = Math.floor(Date.now() / 1000);
      return payload.exp <= now;
    };

    const scheduleExpiryLogout = (token) => {
      try {
        const payload = parseJwt(token);
        if (!payload || !payload.exp) return null;
        const expiresAt = payload.exp * 1000;
        const ms = expiresAt - Date.now();
        if (ms <= 0) {
          // already expired
          logout();
          return null;
        }
        // clear previous timer
        if (expiryTimer) clearTimeout(expiryTimer);
        expiryTimer = setTimeout(() => {
          logout();
        }, ms + 1000);
        return expiryTimer;
      } catch (err) {
        return null;
      }
    };

    const checkTokenState = () => {
      const token = localStorage.getItem('token');
      const storedUserName = localStorage.getItem('userName');
      const storedUserRole = localStorage.getItem('userRole');
      const storedUserId = localStorage.getItem('userId');

      if (!token) {
        setIsLoggedIn(false);
        setUserName('');
        setUserRole('');
        setUserId('');
        return;
      }

      if (isTokenExpired(token)) {
        // Remove stale credentials
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        setIsLoggedIn(false);
        setUserName('');
        setUserRole('');
        setUserId('');
        return;
      }

      // token present and valid
      if (storedUserName && storedUserRole && storedUserId) {
        setIsLoggedIn(true);
        setUserName(storedUserName);
        setUserRole(storedUserRole);
        setUserId(storedUserId);
        scheduleExpiryLogout(token);
      } else {
        // partial data: clear everything to avoid inconsistent state
        setIsLoggedIn(false);
        setUserName('');
        setUserRole('');
        setUserId('');
      }
    };

    // initial check
    checkTokenState();

    // Listen for storage changes to keep state in sync across tabs/windows
    const handleStorageChange = () => {
      checkTokenState();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (expiryTimer) clearTimeout(expiryTimer);
    };
  }, []);

  // Function to handle login
  const login = (token, id, name, role) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', id);
    localStorage.setItem('userName', name);
    localStorage.setItem('userRole', role);
    setIsLoggedIn(true);
    setUserName(name);
    setUserRole(role);
    setUserId(id);
  };

  // Function to handle logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    setIsLoggedIn(false);
    setUserName('');
    setUserRole('');
    setUserId('');
  };

  // Value provided by the context
  const authContextValue = {
    isLoggedIn,
    userName,
    userRole,
    userId,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
