import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { MessageCircle, Send, Plus, Search, Filter, User, Clock, ThumbsUp, MessageSquare, Edit, Trash, MoreVertical, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Define the AskQuestionModal component outside the main component.
// Using React.memo to prevent unnecessary re-renders.
const AskQuestionModal = memo(({ show, onClose, onSubmit, formData, onFormChange, isSubmitting, error, categories }) => {
  if (!show) return null;
  const titleRef = useRef(null);
  useEffect(() => {
    if (show && titleRef.current) {
      titleRef.current.focus();
    }
  }, [show]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Ask a Question</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Plus className="h-6 w-6 rotate-45 text-black" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question Title *</label>
            <input
              type="text"
              required
              name="title"
              value={formData.title}
              onChange={onFormChange}
              ref={titleRef}
              className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-shown:text-gray-500"
              placeholder="What's your question? Be specific."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              required
              rows={4}
              name="description"
              value={formData.description}
              onChange={onFormChange}
              className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-shown:text-gray-500"
              placeholder="Provide details about your question, what you've tried, and what you need help with."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={onFormChange}
                className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.slice(1).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={onFormChange}
                className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-shown:text-gray-500"
                placeholder="e.g., Calculus, Physics, React"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={onFormChange}
              className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-shown:text-gray-500"
              placeholder="Add tags separated by commas (e.g., calculus, derivatives, limits)"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting...' : 'Post Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default function Solution() {
  const { userId, userName, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showAskQuestion, setShowAskQuestion] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [chatMessage, setChatMessage] = useState('');
  const [newChatSearch, setNewChatSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQuestionDetail, setSelectedQuestionDetail] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // Helper to safely read author id
  const getAuthorId = (author) => {
    if (!author) return null;
    if (typeof author === 'string') return author;
    if (author._id) return String(author._id);
    return String(author);
  };

  const isOwnerOrAdminOf = (author) => {
    if (!userId) return false;
    return userRole === 'admin' || String(getAuthorId(author)) === String(userId);
  };
  const [answerText, setAnswerText] = useState('');
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState(null);
  const [questionFormData, setQuestionFormData] = useState({
    title: '',
    description: '',
    category: 'Mathematics',
    subject: '',
    tags: ''
  });

  // Fetch questions from API
  const fetchQuestions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await fetch('/api/questions', { headers });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        console.log('Failed to fetch questions, using mock data');
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();

    // Set mock data for chat users and available users
    setChatUsers([
      { id: 1, name: "Emma Wilson", avatar: "EW", lastMessage: "Thanks for the help with calculus!", timestamp: "2 min ago", unread: 0, online: true },
      { id: 2, name: "David Kim", avatar: "DK", lastMessage: "Can you explain the concept again?", timestamp: "1 hour ago", unread: 2, online: false },
      { id: 3, name: "Lisa Park", avatar: "LP", lastMessage: "Great explanation!", timestamp: "3 hours ago", unread: 0, online: true }
    ]);

    // Mock available users for new chat
    setAvailableUsers([
      { id: 1, name: "Emma Wilson", avatar: "EW", role: "Student", subject: "Mathematics", online: true },
      { id: 2, name: "David Kim", avatar: "DK", role: "Student", subject: "Physics", online: false },
      { id: 3, name: "Lisa Park", avatar: "LP", role: "Student", subject: "Computer Science", online: true },
      { id: 4, name: "Dr. Sarah Chen", avatar: "SC", role: "Teacher", subject: "Physics", online: true },
      { id: 5, name: "Prof. Mike Rodriguez", avatar: "MR", role: "Teacher", subject: "Computer Science", online: false },
      { id: 6, name: "Alex Johnson", avatar: "AJ", role: "Student", subject: "Mathematics", online: true },
      { id: 7, name: "Dr. Emily Brown", avatar: "EB", role: "Teacher", subject: "Chemistry", online: true },
      { id: 8, name: "James Wilson", avatar: "JW", role: "Student", subject: "Biology", online: false }
    ]);
  }, [fetchQuestions]);

  const categories = ['all', 'Mathematics', 'Physics', 'Computer Science', 'Chemistry', 'Biology', 'Literature', 'History'];

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || q.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(newChatSearch.toLowerCase()) ||
    user.subject.toLowerCase().includes(newChatSearch.toLowerCase()) ||
    user.role.toLowerCase().includes(newChatSearch.toLowerCase())
  );

  const startNewChat = (user) => {
    // Check if chat already exists
    const existingChat = chatUsers.find(chat => chat.id === user.id);
    if (existingChat) {
      setSelectedChat(existingChat);
    } else {
      // Create new chat
      const newChat = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        lastMessage: "Start a new conversation",
        timestamp: "Now",
        unread: 0,
        online: user.online
      };
      setChatUsers(prev => [newChat, ...prev]);
      setSelectedChat(newChat);
    }
    setShowNewChat(false);
    setNewChatSearch('');
  };

  const sendMessage = () => {
    if (chatMessage.trim() && selectedChat) {
      // Here you would typically send the message to the backend
      console.log('Sending message:', chatMessage, 'to:', selectedChat.name);
      setChatMessage('');
    }
  };

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setQuestionFormData(prevData => ({ ...prevData, [name]: value }));
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowAskQuestion(false);
    setQuestionFormData({
      title: '',
      description: '',
      category: 'Mathematics',
      subject: '',
      tags: ''
    });
    setError(null);
  }, []);

  const handleQuestionSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(questionFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to post question');
      }

      const result = await response.json();
      console.log('Question posted successfully:', result);

      handleCloseModal();
      fetchQuestions();

    } catch (error) {
      console.error('Error posting question:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [questionFormData, handleCloseModal, fetchQuestions]);

  // Open question detail modal and load its data
  const openQuestion = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/questions/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        console.error('Failed to load question detail');
        return;
      }
      const data = await res.json();
      setSelectedQuestionDetail(data.question || data);
      setShowQuestionModal(true);
    } catch (err) {
      console.error('Error loading question detail', err);
    }
  }, []);

  const handleAnswerSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedQuestionDetail) return;
    setAnswerSubmitting(true);
    setAnswerError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAnswerError('Please login to submit an answer.');
        return;
      }
      const res = await fetch(`/api/questions/${selectedQuestionDetail._id}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answer: answerText })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit answer');
      }
      const updated = await res.json();
      // updated.question should have new answers; refresh local state
      setSelectedQuestionDetail(updated.question || selectedQuestionDetail);
      setAnswerText('');
      // refresh question list counts and answers
      fetchQuestions();
    } catch (err) {
      console.error('Error submitting answer', err);
      setAnswerError(err.message || 'Failed to submit answer');
    } finally {
      setAnswerSubmitting(false);
    }
  }, [answerText, selectedQuestionDetail, fetchQuestions]);

  const NewChatModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">New Chat</h2>
          <button
            onClick={() => setShowNewChat(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users, teachers, or students..."
              value={newChatSearch}
              onChange={(e) => setNewChatSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredAvailableUsers.map(user => (
              <div
                key={user.id}
                onClick={() => startNewChat(user)}
                className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user.avatar}
                  </div>
                  {user.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{user.name}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'Teacher' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{user.subject}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ChatInterface = () => (
    <div className="fixed inset-0 z-50 flex bg-white">
      {/* Chat Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
            <div className="flex items-center space-x-2">
              <button onClick={() => setShowNewChat(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="New Chat">
                <Users className="h-5 w-5" />
              </button>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatUsers.map(user => (
            <div
              key={user.id}
              onClick={() => setSelectedChat(user)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat?.id === user.id ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.avatar}
                  </div>
                  {user.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{user.name}</h4>
                    <span className="text-xs text-gray-500">{user.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{user.lastMessage}</p>
                  {user.unread > 0 && (
                    <div className="mt-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                      {user.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Main Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedChat.avatar}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{selectedChat.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedChat.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              <div className="space-y-4">
                {/* Sample messages */}
                <div className="flex justify-end">
                  <div className="max-w-xs lg:max-w-md bg-blue-600 text-white p-3 rounded-lg rounded-br-none">
                    <p className="text-sm">Hey! I have a question about the calculus homework.</p>
                    <span className="text-xs text-blue-200 block mt-1">2:30 PM</span>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md bg-white p-3 rounded-lg rounded-bl-none shadow-sm">
                    <p className="text-sm">Sure! What's the problem?</p>
                    <span className="text-xs text-gray-500 block mt-1">2:32 PM</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-xs lg:max-w-md bg-blue-600 text-white p-3 rounded-lg rounded-br-none">
                    <p className="text-sm">I'm stuck on question 3 about derivatives. Can you help me understand the chain rule?</p>
                    <span className="text-xs text-blue-200 block mt-1">2:33 PM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Select a conversation to start chatting</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-wrap justify-between bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl px-4 sm:px-6 lg:px-8 justify-between">
          <div className="flex md:flex-wrap sm:flex-wrap items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Study Solutions</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3 mr-3">
          <button
            onClick={() => setShowChat(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
          <button
            onClick={() => setShowAskQuestion(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ask Question
          </button>

        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('questions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'questions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Questions & Answers
              </button>
              <button
                onClick={() => setActiveTab('solutions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'solutions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                My Solutions
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 placeholder-shown:text-gray-600" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-shown:text-gray-600"
            />
          </div>

          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-black px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Questions List */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
                  <p className="text-gray-500 mb-6">
                    Be the first to ask a question and start learning together!
                  </p>
                  <button
                    onClick={() => setShowAskQuestion(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ask First Question
                  </button>
                </div>
              </div>
            ) : (
              filteredQuestions.map((question, idx) => (
                <div key={question._id || question.id || idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    {/* Voting */}
                    <div className="flex flex-col ml-0 items-center space-y-1">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ThumbsUp className="h-5 w-5 text-gray-400 hover:text-blue-600" />
                      </button>
                      <span className="text-sm font-medium text-gray-900">{question.voteCount || 0}</span>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ThumbsUp className="h-5 w-5 text-gray-400 hover:text-red-600 rotate-180" />
                      </button>
                    </div>

                    {/* Question Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex sm:mr-8 items-center space-x-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {question.category}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {question.subject}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 cursor-pointer" onClick={() => openQuestion(question._id || question.id)}>
                        {question.title}
                      </h3>

                      <p className="text-gray-600 mb-4 line-clamp-2">{question.description}</p>

                      <div className="flex flex-wrap items-center justify-between">
                        <div className="flex flex-wrap sm:flex-wrap -ml-10 space-x-4 text-sm text-gray-500">
                          <div className="flex mx-auto space-x-1">
                            <User className="h-4 w-4" />
                            <span>{question.authorName || question.author?.name || 'Anonymous'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{question.createdAt ? new Date(question.createdAt).toLocaleDateString() : 'Unknown'}</span>
                          </div>
                          <div className="flex md:flex-row items-center space-x-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{question.answerCount || 0} answers</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isOwnerOrAdminOf(question.author) && (
                            <button onClick={async () => {
                              if (!question._id) return;
                              const token = localStorage.getItem('token');
                              try {
                                const res = await fetch(`/api/questions/${question._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                if (!res.ok) throw new Error('Delete failed');
                                // refresh list
                                fetchQuestions();
                              } catch (err) {
                                console.error('Delete question error', err);
                                alert('Failed to delete question');
                              }
                            }} className="p-2 text-red-500 hover:text-red-700 hover:bg-gray-100 rounded-lg transition-colors">
                              <Trash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* My Solutions Tab */}
        {activeTab === 'solutions' && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No solutions yet</h3>
              <p className="text-gray-500 mb-6">
                When you answer questions, your solutions will appear here for easy access.
              </p>
              <button
                onClick={() => setActiveTab('questions')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Questions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AskQuestionModal
        show={showAskQuestion}
        onClose={handleCloseModal}
        onSubmit={handleQuestionSubmit}
        formData={questionFormData}
        onFormChange={handleFormChange}
        isSubmitting={isSubmitting}
        error={error}
        categories={categories}
      />
      {/* Question Detail Modal */}
      {showQuestionModal && selectedQuestionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">{selectedQuestionDetail.title}</h2>
              <button type="button" onClick={() => setShowQuestionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-6 w-6 text-black" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">{selectedQuestionDetail.description}</p>
              <div className="space-y-3">
                <h4 className="text-purple-600 text-lg font-semibold">Answers</h4>
                {selectedQuestionDetail.answers && selectedQuestionDetail.answers.length > 0 ? (
                  selectedQuestionDetail.answers.map((ans, i) => (
                    <div key={ans._id || ans.id || i} className="border-gray-700 p-3 border rounded-lg flex justify-between items-start">
                      <div>
                        <div className="text-sm text-gray-700">{ans.answer}</div>
                        <div className="text-xs text-gray-500 mt-2">By {ans.authorName} • {ans.createdAt ? new Date(ans.createdAt).toLocaleString() : ''}</div>
                      </div>
                      {isOwnerOrAdminOf(ans.author) && (
                        <div>
                          <button onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              const aid = ans._id || ans.id;
                              if (!aid) throw new Error('Answer id not found');
                              const url = `/api/questions/${selectedQuestionDetail._id}/answers/${aid}`;
                              console.log('Deleting answer at', url);
                              // Try DELETE first
                              let res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                              // Some proxies/clients block bodies for DELETE or strip headers; if DELETE fails, try POST fallback
                              if (!res.ok) {
                                try {
                                  const errData = await res.json().catch(() => ({}));
                                  console.warn('DELETE response not ok, err:', errData);
                                } catch (_) { }
                                // fallback POST
                                const fallbackUrl = `/api/questions/${selectedQuestionDetail._id}/answers/delete`;
                                console.log('Falling back to POST', fallbackUrl);
                                res = await fetch(fallbackUrl, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ answerId: aid })
                                });
                              }
                              if (!res.ok) {
                                const errData = await res.json().catch(() => ({}));
                                throw new Error(errData.message || 'Delete failed');
                              }
                              const data = await res.json();
                              // update modal state from returned question if available
                              if (data && data.question) {
                                setSelectedQuestionDetail(data.question);
                              } else {
                                // fallback: remove answer locally
                                setSelectedQuestionDetail(prev => ({
                                  ...prev,
                                  answers: prev.answers ? prev.answers.filter(a => (a._id || a.id) !== aid) : []
                                }));
                              }
                              fetchQuestions();
                            } catch (err) {
                              console.error('Delete answer error', err);
                              alert(err.message || 'Failed to delete answer');
                            }
                          }} className="text-red-500 hover:text-red-700 ml-4">Delete</button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No answers yet — be the first to answer.</div>
                )}
              </div>

              <form onSubmit={handleAnswerSubmit} className="space-y-2">
                {answerError && <div className="text-red-600">{answerError}</div>}
                <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={4} className="text-black w-full border px-3 py-2 rounded-lg border-gray-700 placeholder-shown:text-gray-500" placeholder="Write your answer..." required />
                <div className="flex justify-end">
                  <button type="submit" disabled={answerSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{answerSubmitting ? 'Submitting...' : 'Submit Answer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showNewChat && <NewChatModal />}
      {showChat && <ChatInterface />}
    </div>
  );
}