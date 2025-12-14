import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Users, BookOpen, Search, Zap, MessageCircle, Shield, Plus, MessageSquare, Clock, UserCircle, LogOut } from 'lucide-react';

// Import useAuth from your AuthContext
import { useAuth } from './contexts/AuthContext.jsx'; // Corrected extension

// Import your page components (assuming they are in a 'pages' subdirectory)
import HomePage from './pages/Homepage';
import SignupLogin from './pages/SignupLogin';
import LostAndFound from './pages/LostAndFound';
import SkillExchange from './pages/SkillExchange';
import NotesExchange from './pages/NotesExchange'; // New import
import Solution from './pages/Solution';
import AdminDashboard from './pages/AdminDashboard';


const API_BASE = "https://unicon-project-2.onrender.com";

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const { pathname } = window.location ? { pathname: window.location.pathname } : { pathname: '/' };

  useEffect(() => {
    if (!isLoggedIn) {
      // send user to auth page and include where they wanted to go
      navigate('/auth', { replace: true, state: { from: pathname } });
    }
  }, [isLoggedIn, navigate, pathname]);

  return isLoggedIn ? children : null;
};

// AppHeader component
const AppHeader = () => {
  const navigate = useNavigate();
  const { isLoggedIn, userName, userRole, logout } = useAuth();
  const [notifications, setNotifications] = useState({ skills: 0, lostitems: 0, resources: 0, questions: 0 });
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // helper to get lastSeen timestamp for a resource type
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

  // Poll backend for new items
  const pollNotifications = async () => {
    try {
      const endpoints = [
        { key: 'skills', url: '${API_BASE}/api/skills' },
        { key: 'lostitems', url: '${API_BASE}/api/lostitems' },
        { key: 'resources', url: '${API_BASE}/api/resources' },
        { key: 'questions', url: '{API_BASE}/api/questions' }
      ];

      const results = await Promise.all(endpoints.map(e => fetch(e.url).then(r => r.ok ? r.json().catch(() => []) : []).catch(() => [])));

      const newCounts = { skills: 0, lostitems: 0, resources: 0, questions: 0 };

      endpoints.forEach((e, i) => {
        const data = results[i] || [];
        // normalize items array for questions (controller returns { questions })
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
      console.error('Error polling notifications', err);
    }
  };

  // start polling when header mounts
  useEffect(() => {
    // initialize lastSeen if missing
    ['skills', 'lostitems', 'resources', 'questions'].forEach(t => {
      if (!localStorage.getItem(`lastSeen_${t}`)) {
        setLastSeen(t, Date.now());
      }
    });

    pollNotifications();
    const id = setInterval(pollNotifications, 30000); // every 30s
    return () => clearInterval(id);
  }, []);

  const handleLogoutClick = () => {
    logout();
    navigate('/');
  };

  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center relative">
      <div className="text-2xl font-bold text-blue-600">
        <img className='h-20 w-20' src="unicon.png" alt="UniCon Logo" />
      </div>

      {/* Desktop navigation - hidden on small screens */}
      <nav className="space-x-4 desktop-only">
        <Link to="/homepage" className="text-gray-700 hover:text-blue-600">Home</Link>
        <Link to="/lost-found" className="text-gray-700 hover:text-blue-600">Lost & Found</Link>
        <Link to="/skill-exchange" className="text-gray-700 hover:text-blue-600">Skill Exchange</Link>
        <Link to="/notes-exchange" className="text-gray-700 hover:text-blue-600">Notes Exchange</Link>
        <Link to="/solution" className="text-gray-700 hover:text-blue-600">Solution</Link>
        {/** Admin link visible only to admins (rendered client-side) */}
        {typeof window !== 'undefined' && localStorage.getItem('userRole') === 'admin' && (
          <Link to="/admin" className="text-gray-700 hover:text-blue-600">Admin</Link>
        )}
      </nav>

      <div className="flex items-center space-x-2">
        {/* Notification bell (desktop only) */}
        <div className="relative desktop-only">
          <button
            onClick={() => setShowNotifications(s => !s)}
            title="Notifications"
            className="btn btn-ghost btn-circle text-black hover:text-gray-700 bg-white border-0 shadow-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {(notifications.skills + notifications.lostitems + notifications.resources + notifications.questions) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">{notifications.skills + notifications.lostitems + notifications.resources + notifications.questions}</span>
            )}
          </button>

          {showNotifications && (
            <div className="text-green-500 absolute right-0 mt-10 w-64 bg-white border rounded-lg shadow-lg z-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <strong>New posts</strong>
                <button onClick={() => { clearAllLastSeen(); setShowNotifications(false); }} className="text-sm text-blue-600">Mark all read</button>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span>Skills</span>
                  <button onClick={() => { setLastSeen('skills', Date.now()); setNotifications(n => ({ ...n, skills: 0 })); }} className="text-xs text-blue-600">{notifications.skills} new</button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Lost & Found</span>
                  <button onClick={() => { setLastSeen('lostitems', Date.now()); setNotifications(n => ({ ...n, lostitems: 0 })); }} className="text-xs text-blue-600">{notifications.lostitems} new</button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Resources</span>
                  <button onClick={() => { setLastSeen('resources', Date.now()); setNotifications(n => ({ ...n, resources: 0 })); }} className="text-xs text-blue-600">{notifications.resources} new</button>
                </li>
                <li className="flex items-center justify-between">
                  <span>Questions</span>
                  <button onClick={() => { setLastSeen('questions', Date.now()); setNotifications(n => ({ ...n, questions: 0 })); }} className="text-xs text-blue-600">{notifications.questions} new</button>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Auth controls (desktop) */}
        {isLoggedIn ? (
          <>
            <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-full shadow-sm text-gray-700 desktop-only">
              <UserCircle className="w-5 h-5" />
              <span className="font-medium">{userName}</span>
            </div>
            <button
              onClick={handleLogoutClick}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors desktop-only"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn btn-outline btn-info mx-1 desktop-only">
            Join Now
          </Link>
        )}
        <div className="mobile-only relative">
          <button
            onClick={() => setShowNotifications(s => !s)}
            title="Notifications"
            className="btn btn-ghost btn-circle text-black hover:text-gray-700 bg-white border-0 shadow-none"
            style={{ padding: 6 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {(notifications.skills + notifications.lostitems + notifications.resources + notifications.questions) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">{notifications.skills + notifications.lostitems + notifications.resources + notifications.questions}</span>
            )}
          </button>

          {showNotifications && (
            <div className="mobile-only absolute right-0 flex flex-wrap justify-between mt-12 w-55 h-40 bg-white border rounded-lg shadow-lg z-50 p-3">
              <div className="flex text-green-600 items-center justify-between gap-2 mb-2">
                <strong>New posts</strong>
                <button onClick={() => { clearAllLastSeen(); setShowNotifications(false); }} className="text-sm text-blue-600">Mark all read</button>
              </div>
              <div>
                <ul className="space-y-2 text-sm">
                  <li className="flex text-green-600 items-center justify-between">
                    <span>Skills</span>
                    <button onClick={() => { setLastSeen('skills', Date.now()); setNotifications(n => ({ ...n, skills: 0 })); }} className="text-xs ml-[100px] text-blue-600">{notifications.skills} new</button>
                  </li>
                  <li className="flex text-green-600 items-center justify-between">
                    <span>Lost & Found</span>
                    <button onClick={() => { setLastSeen('lostitems', Date.now()); setNotifications(n => ({ ...n, lostitems: 0 })); }} className="text-xs text-blue-600">{notifications.lostitems} new</button>
                  </li>
                  <li className="flex text-green-600 items-center justify-between">
                    <span>Resources</span>
                    <button onClick={() => { setLastSeen('resources', Date.now()); setNotifications(n => ({ ...n, resources: 0 })); }} className="text-xs text-blue-600">{notifications.resources} new</button>
                  </li>
                  <li className="flex text-green-600 items-center justify-between">
                    <span>Questions</span>
                    <button onClick={() => { setLastSeen('questions', Date.now()); setNotifications(n => ({ ...n, questions: 0 })); }} className="text-xs text-blue-600">{notifications.questions} new</button>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Mobile hamburger (visible only on small screens) */}
        <div className="mobile-only">
          <button onClick={() => setMobileMenuOpen(s => !s)} aria-label="Menu" style={{ color: 'black', background: 'transparent', border: 'none', padding: 8 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-menu mobile-only" style={{ color: 'black', position: 'absolute', top: 72, right: 16, background: '#fff', border: '1px solid #eee', padding: 12, borderRadius: 8, zIndex: 60 }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li style={{ padding: '8px 0' }}><Link to="/homepage" onClick={() => setMobileMenuOpen(false)}>Home</Link></li>
            <li style={{ padding: '8px 0' }}><Link to="/lost-found" onClick={() => setMobileMenuOpen(false)}>Lost & Found</Link></li>
            <li style={{ padding: '8px 0' }}><Link to="/skill-exchange" onClick={() => setMobileMenuOpen(false)}>Skill Exchange</Link></li>
            <li style={{ padding: '8px 0' }}><Link to="/notes-exchange" onClick={() => setMobileMenuOpen(false)}>Notes Exchange</Link></li>
            <li style={{ padding: '8px 0' }}><Link to="/solution" onClick={() => setMobileMenuOpen(false)}>Solution</Link></li>
            {typeof window !== 'undefined' && localStorage.getItem('userRole') === 'admin' && (
              <li style={{ padding: '8px 0' }}>
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
              </li>
            )}
            <li style={{ borderTop: '1px solid #eee', marginTop: 8, paddingTop: 8 }}>
              {isLoggedIn ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <UserCircle className="w-5 h-5" />
                    <span>{userName}</span>
                  </div>
                  <button onClick={() => { handleLogoutClick(); setMobileMenuOpen(false); }} style={{ color: '#e11d48', background: 'transparent', border: 'none', padding: 0 }}>Logout</button>
                </div>
              ) : (
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>Join Now</Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};


export default function App() {
  return (
    <div className="max-h-screen-3xl bg-gray-200">
      <AppHeader />

      <Routes>
        {/* Public homepage on root */}
        <Route path="/" element={<HomePage />} />
        {/* Auth page moved to /auth */}
        <Route path="/auth" element={<SignupLogin />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/lost-found" element={<ProtectedRoute><LostAndFound /></ProtectedRoute>} />
        <Route path="/skill-exchange" element={<ProtectedRoute><SkillExchange /></ProtectedRoute>} />
        <Route path="/notes-exchange" element={<ProtectedRoute><NotesExchange /></ProtectedRoute>} /> {/* New Route */}
        <Route path="/solution" element={<ProtectedRoute><Solution /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<HomePage />} />
      </Routes>

      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm"><img src="unicon.png" alt="UniCon Logo" /></span>
                </div>
                <span className="ml-2 text-xl font-bold">Unicon</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Connecting students, sharing solutions, and building stronger campus communities together.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-400 hover:text-white transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/homepage" className="text-gray-400 hover:text-white transition-colors">Find Students</Link></li>
                <li><Link to="/lost-found" className="text-gray-400 hover:text-white transition-colors">Lost & Found</Link></li>
                <li><Link to="/skill-exchange" className="text-gray-400 hover:text-white transition-colors">Skills Exchange</Link></li>
                <li><Link to="/solution" className="text-gray-400 hover:text-white transition-colors">Share Solutions</Link></li>
                <li><Link to="/notes-exchange" className="text-gray-400 hover:text-white transition-colors">Campus Chat</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Safety Guidelines</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-400">
                  <Mail className="w-5 h-5 mr-3" />
                  <span>hello@unicon.edu</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <Phone className="w-5 h-5 mr-3" />
                  <span>+91 9554209826</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <MapPin className="w-5 h-5 mr-3" />
                  <span>Babu Banarasi Das University,Lucknow </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2024 Unicon. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy
                </a>
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Terms
                </a>
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Cookies
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
