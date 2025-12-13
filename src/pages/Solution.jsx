import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { MessageCircle, Send, Plus, Search, Filter, User, Clock, ThumbsUp, MessageSquare, Edit, Trash, MoreVertical, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = "https://unicon-project-2.onrender.com"; 


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
              placeholder="Provide details about your question."
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
                className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="e.g., Calculus, Physics"
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
              className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg"
              placeholder="comma separated"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
              {isSubmitting ? "Posting..." : "Post Question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// --------------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------------

export default function Solution() {
  const { userId, userName, userRole } = useAuth();

  const [activeTab, setActiveTab] = useState("questions");
  const [questions, setQuestions] = useState([]);

  const [showAskQuestion, setShowAskQuestion] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [selectedQuestionDetail, setSelectedQuestionDetail] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  const [answerText, setAnswerText] = useState("");
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState(null);

  const categories = ['all', 'Mathematics', 'Physics', 'Computer Science', 'Chemistry', 'Biology'];

  // --------------------------------------------------------
  // FETCH QUESTIONS (with API URL)
  // --------------------------------------------------------

  const fetchQuestions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API}/api/questions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // --------------------------------------------------------
  // SUBMIT NEW QUESTION
  // --------------------------------------------------------

  const [questionFormData, setQuestionFormData] = useState({
    title: "",
    description: "",
    category: "Mathematics",
    subject: "",
    tags: ""
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setQuestionFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(questionFormData)
      });

      if (!res.ok) throw new Error("Failed to post question");

      fetchQuestions();
      setShowAskQuestion(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------
  // OPEN QUESTION DETAILS
  // --------------------------------------------------------

  const openQuestion = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/questions/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const data = await res.json();
      setSelectedQuestionDetail(data.question);
      setShowQuestionModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // --------------------------------------------------------
  // SUBMIT ANSWER
  // --------------------------------------------------------

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuestionDetail) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/questions/${selectedQuestionDetail._id}/answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ answer: answerText })
      });

      const updated = await res.json();
      setSelectedQuestionDetail(updated.question);
      setAnswerText("");
    } catch (err) {
      setAnswerError(err.message);
    }
  };

  // --------------------------------------------------------
  // SEARCH & FILTER
  // --------------------------------------------------------

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filterCategory === "all" || q.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // --------------------------------------------------------
  // RENDER JSX
  // --------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="flex justify-between bg-white shadow-sm border-b p-4">
        <h1 className="text-2xl font-bold">Study Solutions</h1>

        <button
          onClick={() => setShowAskQuestion(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <Plus className="h-4 w-4 inline mr-2" /> Ask Question
        </button>
      </div>

      {/* SEARCH */}
      <div className="max-w-4xl mx-auto mt-6 flex gap-4">
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 px-4 py-2 border rounded-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="px-4 py-2 border rounded-lg"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "all" ? "All Categories" : cat}
            </option>
          ))}
        </select>
      </div>

      {/* QUESTIONS LIST */}
      <div className="max-w-4xl mx-auto mt-8 space-y-4">
        {filteredQuestions.map((q) => (
          <div
            key={q._id}
            className="bg-white p-6 rounded-xl border shadow-sm cursor-pointer"
            onClick={() => openQuestion(q._id)}
          >
            <h3 className="text-lg font-bold">{q.title}</h3>
            <p className="text-gray-600 line-clamp-2">{q.description}</p>
          </div>
        ))}
      </div>

      {/* MODALS */}
      <AskQuestionModal
        show={showAskQuestion}
        onClose={() => setShowAskQuestion(false)}
        onSubmit={handleQuestionSubmit}
        formData={questionFormData}
        onFormChange={handleFormChange}
        isSubmitting={isSubmitting}
        error={error}
        categories={categories}
      />

      {/* QUESTION DETAIL MODAL */}
      {showQuestionModal && selectedQuestionDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
            <h2 className="text-xl font-bold">{selectedQuestionDetail.title}</h2>
            <p className="mt-2">{selectedQuestionDetail.description}</p>

            <h3 className="mt-4 font-semibold">Answers</h3>

            {selectedQuestionDetail.answers?.map((a, i) => (
              <div key={i} className="border rounded p-2 mt-2">
                {a.answer}
              </div>
            ))}

            <form onSubmit={handleAnswerSubmit} className="mt-4">
              <textarea
                className="w-full border rounded p-2"
                rows="3"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
              ></textarea>

              <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
                Submit Answer
              </button>
            </form>

            <button
              onClick={() => setShowQuestionModal(false)}
              className="mt-4 px-4 py-2 bg-gray-300 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
