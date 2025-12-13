import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Users, BookOpen, Search, Zap, MessageCircle, Shield, Plus, MessageSquare, Clock, UserCircle, LogOut } from 'lucide-react';

import { useAuth } from './contexts/AuthContext.jsx';

import HomePage from './pages/Homepage';
import SignupLogin from './pages/SignupLogin';
import LostAndFound from './pages/LostAndFound';
import SkillExchange from './pages/SkillExchange';
import NotesExchange from './pages/NotesExchange';
import Solution from './pages/Solution';
import AdminDashboard from './pages/AdminDashboard';

const API_BASE = "https://unicon-project-2.onrender.com";

// ProtectedRoute Component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const { pathname } = window.location ? { pathname: window.location.pathname } : { pathname: '/' };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth', { replace: true, state: { from: pathname } });
    }
  }, [isLoggedIn, navigate, pathname]);

  return isLoggedIn ? children : null;
};

// ------------------------------------------------------
// HEADER COMPONENT
// ------------------------------------------------------
const AppHeader = () => {
  const navigate = useNavigate();
  const { isLoggedIn, userName, userRole, logout } = useAuth();

  const [notifications, setNotifications] = useState({ skills: 0, lostitems: 0, resources: 0, questions: 0 });
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getLastSeen = (type) => {
    const v = localStorage.getItem(`lastSeen_${type}`);
    return v ? parseInt(v, 10) : 0;
  };

  const setLastSeen = (type, ts) => {
    localStorage.setItem(`lastSeen_${type}`, String(ts));
  };

  const clearAllLastSeen = () => {
    ['skills', 'lostitems', 'resources', 'questions'].forEach(t => setLastSeen(t, Date.now()));
    setNotifications({ skills: 0, lostitems: 0, resources: 0, questions: 0 });
  };

  // ------------------------------------------------------
  // 🔥 POLLING API (now uses Render backend)
  // ------------------------------------------------------
  const pollNotifications = async () => {
    try {
      const endpoints = [
        { key: 'skills', url: `${API_BASE}/api/skills` },
        { key: 'lostitems', url: `${API_BASE}/api/lostitems` },
        { key: 'resources', url: `${API_BASE}/api/resources` },
        { key: 'questions', url: `${API_BASE}/api/questions` }
      ];

      const results = await Promise.all(
        endpoints.map(e =>
          fetch(e.url)
            .then(r => (r.ok ? r.json() : []))
            .catch(() => [])
        )
      );

      const newCounts = { skills: 0, lostitems: 0, resources: 0, questions: 0 };

      endpoints.forEach((e, i) => {
        const data = results[i] || [];
        const items = Array.isArray(data) ? data : (data.questions || []);
        const lastSeen = getLastSeen(e.key) || 0;

        let count = 0;
        items.forEach(it => {
          const ts = it.timestamp ? Number(it.timestamp) : (it.createdAt ? Date.parse(it.createdAt) : 0);
          if (ts && ts > lastSeen) count += 1;
        });

        newCounts[e.key] = count;
      });

      setNotifications(newCounts);
    } catch (err) {
      console.error("Error polling notifications", err);
    }
  };

  useEffect(() => {
    ['skills', 'lostitems', 'resources', 'questions'].forEach(t => {
      if (!localStorage.getItem(`lastSeen_${t}`)) {
        setLastSeen(t, Date.now());
      }
    });

    pollNotifications();
    const id = setInterval(pollNotifications, 30000);
    return () => clearInterval(id);
  }, []);

  const handleLogoutClick = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center relative">
      <div className="text-2xl font-bold text-blue-600">
        <img className='h-20 w-20' src="unicon.png" alt="UniCon Logo" />
      </div>

      {/* Desktop Nav */}
      <nav className="space-x-4 desktop-only">
        <Link to="/homepage" className="text-gray-700 hover:text-blue-600">Home</Link>
        <Link to="/lost-found" className="text-gray-700 hover:text-blue-600">Lost & Found</Link>
        <Link to="/skill-exchange" className="text-gray-700 hover:text-blue-600">Skill Exchange</Link>
        <Link to="/notes-exchange" className="text-gray-700 hover:text-blue-600">Notes Exchange</Link>
        <Link to="/solution" className="text-gray-700 hover:text-blue-600">Solution</Link>
        {localStorage.getItem('userRole') === 'admin' && (
          <Link to="/admin" className="text-gray-700 hover:text-blue-600">Admin</Link>
        )}
      </nav>

      {/* Right Side Controls */}
      <div className="flex items-center space-x-3">
        {/* Notification Bell */}
        <div className="relative desktop-only">
          <button
            onClick={() => setShowNotifications(s => !s)}
            className="btn btn-ghost btn-circle text-black"
          >
            🔔
            {(notifications.skills + notifications.lostitems + notifications.resources + notifications.questions) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {notifications.skills + notifications.lostitems + notifications.resources + notifications.questions}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-10 w-64 bg-white border rounded-lg shadow-lg p-3">
              <strong>New Posts</strong>
              <button onClick={clearAllLastSeen} className="text-blue-600 text-sm float-right">Mark all read</button>

              <ul className="mt-3 space-y-2 text-sm">
                <li>Skills: {notifications.skills}</li>
                <li>Lost & Found: {notifications.lostitems}</li>
                <li>Resources: {notifications.resources}</li>
                <li>Questions: {notifications.questions}</li>
              </ul>
            </div>
          )}
        </div>

        {/* Auth Controls */}
        {isLoggedIn ? (
          <>
            <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-full shadow-sm text-gray-700 desktop-only">
              <UserCircle className="w-5 h-5" />
              <span>{userName}</span>
            </div>
            <button onClick={handleLogoutClick} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 desktop-only">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn btn-outline btn-info desktop-only">Join Now</Link>
        )}

        {/* Mobile Menu */}
        <button
          className="mobile-only"
          onClick={() => setMobileMenuOpen(prev => !prev)}
        >
          ☰
        </button>
      </div>
    </header>
  );
};

// ------------------------------------------------------
// APP ROUTES
// ------------------------------------------------------
export default function App() {
  return (
    <div className="max-h-screen-3xl bg-gray-200">
      <AppHeader />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<SignupLogin />} />
        <Route path="/homepage" element={<HomePage />} />

        <Route path="/lost-found" element={<ProtectedRoute><LostAndFound /></ProtectedRoute>} />
        <Route path="/skill-exchange" element={<ProtectedRoute><SkillExchange /></ProtectedRoute>} />
        <Route path="/notes-exchange" element={<ProtectedRoute><NotesExchange /></ProtectedRoute>} />
        <Route path="/solution" element={<ProtectedRoute><Solution /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  );
}
