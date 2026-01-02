import { useState, useEffect, useRef } from 'react';
import { X, Plus, Search, Pencil, Trash2, BookOpen, Zap, Briefcase, ChevronRight, Video, Globe, Shield } from 'lucide-react';
import { validateUploadContent, getContentPolicyText } from '../utils/contentModeration';

const API = "https://unicon-project-2.onrender.com";

const SkillExchange = () => {
  // App state
  const [skills, setSkills] = useState([]);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillToDelete, setSkillToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showContentPolicy, setShowContentPolicy] = useState(false);
  const [contentPolicyAccepted, setContentPolicyAccepted] = useState(false);

  // Get user info from localStorage (same as other pages)
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem('userId') || null;
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('userName') || null;
  });
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('userRole') || null;
  });

  // Fetches skills from the backend API
  // NOTE: This assumes a backend server is running on http://localhost:5000.
  // You will need to start your backend server for this to work.
  const fetchSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/api/skills`);
      if (!response.ok) {
        throw new Error('Failed to fetch skills from the backend');
      }
      const data = await response.json();
      // Add a mock userId to each skill for demonstration purposes if it's missing
      const skillsWithMockUsers = data.map(skill => ({
        ...skill,
        userId: skill.userId || `mock-user-${Math.random().toString(36).substr(2, 9)}`
      }));
      setSkills(skillsWithMockUsers);
    } catch (e) {
      console.error("Error fetching skills:", e);
      setError(`Failed to load skills. Please ensure the backend server is running. Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  // Effect to handle searching
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSkills(skills);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const results = skills.filter(skill =>
        skill.title.toLowerCase().includes(lowercasedQuery) ||
        skill.description.toLowerCase().includes(lowercasedQuery) ||
        skill.category.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredSkills(results);
    }
  }, [searchQuery, skills]);

  // --- Modal Handlers ---
  const handlePostSuccess = () => {
    setIsPostModalOpen(false);
    fetchSkills();
  };

  const handleDelete = async (skillId) => {
    // Get actual token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found. Please log in again.');
      return;
    }

    try {
      const response = await fetch(`${API}/api/skills/${skillId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete skill');
      }

      fetchSkills(); // Refresh the list
      setIsDeleteModalOpen(false);
      setSkillToDelete(null);
    } catch (e) {
      console.error("Error deleting skill:", e);
      setError(`Failed to delete skill: ${e.message}`);
    }
  };

  // --- Modal Components ---

  // Post Skill Modal Component
  const PostSkillModal = ({ onPostSuccess }) => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      category: '',
      videoUrl: '',
      thumbnailFile: null,
      thumbnailLink: '',
      type: 'practical'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);

      // Check if content policy is accepted
      if (!contentPolicyAccepted) {
        setError('You must accept the content policy to upload files.');
        setIsSubmitting(false);
        return;
      }

      // Debug: Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      // Validate content before upload
      if (formData.thumbnailFile) {
        try {
          const validationResult = await validateUploadContent(formData.thumbnailFile);

          if (!validationResult.overallValid) {
            setError(validationResult.errors.join(', '));
            setIsSubmitting(false);
            return;
          }

          if (validationResult.warnings.length > 0) {
            const proceed = window.confirm(
              `Warning: ${validationResult.warnings.join(', ')}\n\nDo you want to continue with the upload?`
            );
            if (!proceed) {
              setIsSubmitting(false);
              return;
            }
          }
        } catch (validationError) {
          console.error('Content validation error:', validationError);
          setError('Content validation failed. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Debug: Log token for troubleshooting
      console.log('Token found:', token.substring(0, 20) + '...');
      console.log('User ID:', userId);
      console.log('User Name:', userName);

      const dataToSend = new FormData();
      // Append all form data
      dataToSend.append('title', formData.title);
      dataToSend.append('description', formData.description);
      dataToSend.append('category', formData.category);
      dataToSend.append('videoUrl', formData.videoUrl);
      dataToSend.append('type', formData.type);
      dataToSend.append('postedBy', userName || `User ${userId ? userId.substring(0, 5) : 'Unknown'}...`);
      dataToSend.append('userType', 'Student');
      dataToSend.append('userId', userId || 'unknown');

      // Conditional logic for thumbnail: prefer file upload over link
      if (formData.thumbnailFile) {
        dataToSend.append('thumbnail', formData.thumbnailFile);
      } else if (formData.thumbnailLink) {
        dataToSend.append('thumbnailUrl', formData.thumbnailLink);
      }

      // Debug: Log what's being sent
      console.log('Form data being sent:');
      for (let [key, value] of dataToSend.entries()) {
        console.log(key, ':', value);
      }

      try {
        const response = await fetch(`${API}/api/skills`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: dataToSend,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to post skill');
        }

        onPostSuccess();
        setFormData({
          title: '', description: '', category: '', videoUrl: '', thumbnailFile: null, thumbnailLink: '', type: 'practical,'
        });
      } catch (e) {
        console.error("Error adding skill:", e);
        setError(`Failed to post skill: ${e.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    const categories = ['Videography', 'Photo Editing', 'Photography', 'Language Teaching', 'Coding', 'Projects'];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl overflow-y-auto rounded-3xl bg-gray-800 p-8 shadow-2xl max-h-[90vh] text-white">
          <div className="flex items-center justify-between pb-6 border-b border-gray-700">
            <h2 className="text-3xl font-extrabold text-white">Post a New Skill</h2>
            <button onClick={() => setIsPostModalOpen(false)} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Skill Title <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                placeholder="e.g., Learn Editing Video."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Description <span className="text-red-400">*</span></label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                placeholder="Describe the skill you are sharing.."
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Category <span className="text-red-400">*</span></label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Content Type <span className="text-red-400">*</span></label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="practical">Practical Video</option>
                  <option value="live">Live Session</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Video URL (YouTube/Vimeo) <span className="text-red-400">*</span></label>
              <input
                type="url"
                required
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                placeholder="e.g., https://www.youtube.com/watch?v=..."
              />
            </div>
            {/* New Thumbnail Link and File Upload options */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Thumbnail Link (Optional)</label>
                <input
                  type="url"
                  value={formData.thumbnailLink}
                  onChange={(e) => setFormData({ ...formData, thumbnailLink: e.target.value, thumbnailFile: null })}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                  placeholder="Paste an image URL here"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">or</span>
                <div className="flex-grow border-t border-gray-700 mx-4"></div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Upload Thumbnail (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  name="thumbnail"
                  onChange={(e) => setFormData({ ...formData, thumbnailFile: e.target.files[0], thumbnailLink: '' })}
                  className="w-full px-4 py-3 border border-gray-700 rounded-xl bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900 file:text-blue-200 hover:file:bg-blue-800 transition-colors cursor-pointer"
                />
              </div>
            </div>
                 

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="rounded-xl px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-700"
                
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
      
              >
                {isSubmitting ? 'Posting...' : 'Post Skill'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ViewSkillModal = ({ skill, onClose }) => {
    if (!skill) return null;

    // Helper function to extract YouTube video ID from a URL
    const getYouTubeEmbedUrl = (url) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
    };
    const embedUrl = getYouTubeEmbedUrl(skill.videoUrl);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-4xl rounded-3xl bg-gray-800 p-8 shadow-2xl max-h-[90vh] overflow-y-auto text-white">
          <div className="flex items-start justify-between pb-6 border-b border-gray-700 mb-4">
            <div className="pr-4">
              <h2 className="text-3xl font-extrabold text-white leading-tight">{skill.title}</h2>
              <div className="mt-2 text-lg font-medium text-blue-400 flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <span>{skill.category}</span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-6">
            {embedUrl && (
              <div className="aspect-w-16 aspect-h-9 w-full rounded-2xl overflow-hidden shadow-xl">
                <iframe
                  src={embedUrl}
                  title={skill.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            )}
            <div className="prose prose-invert text-gray-300 max-w-none">
              <p>{skill.description}</p>
            </div>
            <div className="border-t border-gray-700 pt-6">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center gap-1 font-semibold text-gray-400">
                  <Globe className="h-4 w-4 text-blue-400" />
                  Posted by: {skill.postedBy}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  Type: {skill.type}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DeleteConfirmationModal = ({ skill, onClose, onConfirm }) => {
    if (!skill) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-3xl bg-gray-800 p-8 shadow-2xl text-white">
          <h2 className="text-2xl font-bold text-white mb-4">Confirm Deletion</h2>
          <p className="text-gray-300 mb-6">Are you sure you want to delete the skill "<span className="font-semibold">{skill.title}</span>"? This action cannot be undone.</p>
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="rounded-xl px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(skill._id)}
              className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans antialiased text-gray-100">
      <header className="bg-pink-800 shadow-xl border-b border-gray-700 py-20">
        <h1 className="flex justify-center h-15 text-5xl font-extrabold text-white tracking-tighter">
          Skill Exchange
        </h1>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 mt-15">

          <div className="flex flex-wrap flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex flex-wrap relative w-full md:w-180 lg:w-250">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex flex-wrap w-full pl-12 pr-4 py-3 rounded-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 w-full md:w-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Post a Skill</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Status Indicators */}
        {loading && (
          <div className="flex items-center justify-center py-8 bg-gray-800 rounded-2xl shadow-xl p-6">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="ml-3 text-lg font-medium text-gray-400">Loading skills...</p>
          </div>
        )}
        {error && (
          <div className="bg-red-900 border-l-4 border-red-500 text-red-300 p-4 rounded-lg shadow-md mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Skills Grid */}
        {!loading && filteredSkills.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-3 xl:grid-cols-3">
            {filteredSkills.map((skill) => (
              <div key={skill._id} className="relative rounded-2xl bg-gray-800 shadow-xl transition-all duration-300 hover:scale-[1.04] hover:shadow-2xl group border border-gray-700">
                <div className="relative">
                  <img
                    src={skill.thumbnailUrl || `https://placehold.co/600x400/1F2937/9CA3AF?text=${skill.category.replace(' ', '+')}`}
                    alt={skill.title}
                    className="h-48 w-full object-cover rounded-t-2xl transition-transform duration-300 group-hover:scale-100"
                  />
                  <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full shadow-lg opacity-90">
                    {skill.category}
                  </div>
                </div>
                <div className="px-4">
                  <h3 className="text-xl font-bold text-white truncate mb-1">{skill.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 min-h-[3rem]">{skill.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
                    <span className="text-sm font-medium text-gray-500">by <span className="text-gray-300 font-semibold">{skill.postedBy}</span></span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setSelectedSkill(skill); setIsViewModalOpen(true); }}
                        className="rounded-full p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition-colors"
                        title="View Details"
                      >Play
                        <BookOpen className="h-5 w-5" />
                      </button>
                      {/* Owners can edit; only admins can delete */}
                      {skill.userId === userId && (
                        <>
                          <button
                            // onClick={() => { /* Handle Edit */ }}
                            className="rounded-full p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 transition-colors"
                            title="Edit Skill"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {(skill.userId === userId || userRole === 'admin') && (
                        <button
                          onClick={() => { setSkillToDelete(skill); setIsDeleteModalOpen(true); }}
                          className="rounded-full p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                          title="Delete Skill"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && filteredSkills.length === 0 && !error && (
          <div className="text-center py-16 bg-gray-800 rounded-2xl shadow-xl p-6">
            <Search className="mx-auto h-20 w-20 text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-300">No skills found.</h2>
            <p className="mt-2 text-gray-500">Try a different search or be the first to share this skill!</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {isPostModalOpen && <PostSkillModal onPostSuccess={handlePostSuccess} />}
      {isViewModalOpen && <ViewSkillModal skill={selectedSkill} onClose={() => setIsViewModalOpen(false)} />}
      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          skill={skillToDelete}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />
      )}

      {/* Content Policy Modal */}
      {showContentPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl bg-gray-800 p-8 shadow-2xl max-h-[90vh] overflow-y-auto text-white">
            <div className="flex items-center justify-between pb-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-blue-500" />
                <h2 className="text-3xl font-extrabold text-white">Content Policy</h2>
              </div>
              <button
                onClick={() => setShowContentPolicy(false)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="pt-6 space-y-6">
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-line text-gray-300">
                  {getContentPolicyText()}
                </div>
              </div>

              <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h3 className="text-yellow-400 font-semibold">Important Notice</h3>
                    <p className="text-yellow-200 text-sm mt-1">
                      All uploads are automatically scanned for inappropriate content.
                      Violations of this policy will result in immediate content removal
                      and may lead to account suspension.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowContentPolicy(false);
                    setContentPolicyAccepted(true);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  I Understand and Agree
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return <SkillExchange />;
}
