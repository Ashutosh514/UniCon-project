import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Plus, X, Download, MessageSquare, Trash2, Search, Filter, Mail, Phone, Book } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

// Reusable Delete Confirmation Modal (can be moved to a shared components folder if desired)
const DeleteConfirmationModal = ({ item, onConfirm, onCancel, type }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
        <p className="mt-4 text-gray-600">
          Are you sure you want to delete this {type === 'notes' ? 'note' : 'book'} "{item.title}"? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const NotesExchange = () => {
  const { userId, userName, userRole } = useAuth(); // Get user info from context
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedResourceType, setSelectedResourceType] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const categories = ['all', 'Lecture Notes', 'Textbooks', 'Study Guides', 'Past Papers', 'Reference Materials', 'Other'];
  const resourceTypes = ['all', 'notes', 'book'];

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/resources');
      if (!response.ok) {
        throw new Error('Failed to fetch resources from the backend');
      }
      const data = await response.json();
      setResources(data);
    } catch (e) {
      console.error("Error fetching resources:", e);
      setError(`Failed to load resources. Please ensure the backend server is running. Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesResourceType = selectedResourceType === 'all' || resource.resourceType === selectedResourceType;
    return matchesSearch && matchesCategory && matchesResourceType;
  });

  const handleDeleteResource = async (resourceId) => {
    try {
      // Debug: Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        return;
      }

      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete resource');
      }

      fetchResources(); // Re-fetch resources to update the list
      setShowDeleteConfirm(null);
    } catch (e) {
      console.error("Error deleting resource:", e);
      setError(`Failed to delete resource: ${e.message}`);
    }
  };

  const PostResourceModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      category: '',
      subject: '',
      resourceType: 'notes', // Default to notes
      resourceFile: null, // For notes/PDFs
      resourceImage: null, // For book covers
      contactEmail: '',
      contactPhone: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const clearForm = () => {
      setFormData({
        title: '',
        description: '',
        category: '',
        subject: '',
        resourceType: 'notes',
        resourceFile: null,
        resourceImage: null,
        contactEmail: '',
        contactPhone: '',
      });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);

      // Debug: Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      // Debug: Log token for troubleshooting
      console.log('Token found:', token.substring(0, 20) + '...');
      console.log('User ID:', userId);
      console.log('User Name:', userName);

      const dataToSend = new FormData();
      for (const key in formData) {
        if (key === 'resourceFile' || key === 'resourceImage') {
          if (formData[key]) {
            dataToSend.append(key, formData[key]);
          }
        } else {
          dataToSend.append(key, formData[key]);
        }
      }
      dataToSend.append('postedBy', userName || 'Anonymous'); // Use full name from context
      dataToSend.append('userId', userId); // Use userId from context

      // Debug: Log what's being sent
      console.log('Form data being sent:');
      for (let [key, value] of dataToSend.entries()) {
        if (key === 'resourceFile' || key === 'resourceImage') {
          console.log(key, ':', value instanceof File ? `File: ${value.name} (${value.type}, ${value.size} bytes)` : value);
        } else {
          console.log(key, ':', value);
        }
      }

      try {
        const response = await fetch('/api/resources', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: dataToSend,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to post resource');
        }

        fetchResources();
        setShowPostModal(false);
        clearForm();
      } catch (e) {
        console.error("Error posting resource:", e);
        setError(`Failed to post resource: ${e.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="relative w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl max-h-[90vh]">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Post New Resource</h2>
            <button onClick={() => { setShowPostModal(false); clearForm(); }} className="rounded-lg p-2 bg-black hover:bg-gray-800">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Calculus I Lecture Notes"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Provide a brief description of the resource."
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.slice(1).map((cat) => ( // Exclude 'all'
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Subject *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Data Structures, Biology"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Resource Type *</label>
              <select
                required
                value={formData.resourceType}
                onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="notes">Notes/File</option>
                <option value="book">Book Exchange</option>
              </select>
            </div>

            {formData.resourceType === 'notes' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Upload File (PDF/DOC/DOCX) *</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    name="resourceFile"
                    onChange={(e) => setFormData({ ...formData, resourceFile: e.target.files[0] })}
                    className="text-black w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {formData.resourceFile && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800 font-medium">Selected File:</p>
                      <p className="text-xs text-green-600">{formData.resourceFile.name}</p>
                      <p className="text-xs text-green-500">{(formData.resourceFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Upload Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    name="resourceImage"
                    onChange={(e) => setFormData({ ...formData, resourceImage: e.target.files[0] })}
                    className="text-black w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">Add a relevant image to make your notes more attractive (e.g., subject icon, cover image)</p>
                  {formData.resourceImage && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 font-medium">Selected Image:</p>
                      <p className="text-xs text-blue-600">{formData.resourceImage.name}</p>
                      <p className="text-xs text-blue-500">{(formData.resourceImage.size / 1024).toFixed(1)} KB</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {formData.resourceType === 'book' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Upload Book Cover Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    name="resourceImage"
                    onChange={(e) => setFormData({ ...formData, resourceImage: e.target.files[0] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {formData.resourceImage && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 font-medium">Selected Image:</p>
                      <p className="text-xs text-blue-600">{formData.resourceImage.name}</p>
                      <p className="text-xs text-blue-500">{(formData.resourceImage.size / 1024).toFixed(1)} KB</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="your.email@university.edu"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Contact Phone (Optional)</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 555-123-4567"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setShowPostModal(false); clearForm(); }}
                className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post Resource'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 text-white text-center shadow-lg">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Notes & Book Exchange
          </h1>
          <p className="mt-4 text-xl opacity-90">
            Share your study materials, find notes, or exchange textbooks with peers.
          </p>
          <button
            onClick={() => setShowPostModal(true)}
            className="mt-10 flex items-center justify-center mx-auto rounded-full bg-green-500 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-transform transform hover:scale-105 hover:bg-green-600 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <Plus className="mr-3 h-6 w-6" />
            Post New Resource
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-100 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-grow w-full md:w-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search notes or books by title, subject, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
              <select
                value={selectedResourceType}
                onChange={(e) => setSelectedResourceType(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              >
                {resourceTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type === 'notes' ? 'Notes/Files' : 'Book Exchange'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        {loading ? (
          <div className="text-center text-gray-500 text-lg">Loading resources...</div>
        ) : filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredResources.map((resource) => (
              <div key={resource._id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-48 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {(resource.resourceType === 'book' && resource.imageUrl) || (resource.resourceType === 'notes' && resource.imageUrl) ? (
                    <img
                      src={resource.imageUrl}
                      alt={resource.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x200/e2e8f0/64748b?text=${resource.resourceType === 'notes' ? 'Notes' : 'Book+Cover'}` }}
                    />
                  ) : (
                    <FileText className="w-24 h-24 text-blue-400 opacity-70" />
                  )}
                  <div className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${resource.resourceType === 'notes' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                    {resource.resourceType === 'notes' ? 'Notes' : 'Book'}
                  </div>
                  {(resource.userId === userId || userRole === 'admin') && (
                    <button
                      onClick={() => setShowDeleteConfirm(resource)}
                      className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      title="Delete this resource"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{resource.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{resource.description}</p>

                  <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-700 mb-4">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">{resource.category}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded-full">{resource.subject}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4 mt-4">
                    <span className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-1 text-gray-400" />
                      Posted by: {resource.postedBy}
                    </span>
                    {resource.resourceType === 'notes' && resource.fileUrl && (
                      <a
                        href={resource.fileUrl.startsWith('http') ? resource.fileUrl : resource.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                        onClick={(e) => {
                          // Handle download for local files
                          if (!resource.fileUrl.startsWith('http')) {
                            e.preventDefault();
                            // Extract filename from the fileUrl path
                            const filename = resource.fileUrl.split('/').pop();
                            const downloadUrl = `/api/resources/download/${filename}`;
                            console.log('Downloading from:', downloadUrl);
                            console.log('Original fileUrl:', resource.fileUrl);
                            console.log('Filename:', filename);
                            console.log('Resource:', resource);

                            // Create a temporary link element to trigger download
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = resource.title + '.pdf';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Note
                      </a>
                    )}
                    {resource.resourceType === 'book' && (
                      <button
                        onClick={() => {
                          let contactLink = `mailto:${resource.contactEmail}?subject=Regarding: ${resource.title} (Book Exchange)&body=Hi ${resource.postedBy}, I'm interested in exchanging for your book: ${resource.title}.`;
                          if (resource.contactPhone) {
                            contactLink = `tel:${resource.contactPhone}`;
                          }
                          window.location.href = contactLink;
                        }}
                        className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact for Book
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <BookOpen className="mx-auto h-20 w-20 text-gray-400 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600">Try adjusting your search or filters, or be the first to post a resource!</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {showPostModal && <PostResourceModal />}
      {showDeleteConfirm && (
        <DeleteConfirmationModal
          item={showDeleteConfirm}
          onConfirm={() => handleDeleteResource(showDeleteConfirm._id)}
          onCancel={() => setShowDeleteConfirm(null)}
          type={showDeleteConfirm.resourceType}
        />
      )}
    </div>
  );
};

export default NotesExchange;
