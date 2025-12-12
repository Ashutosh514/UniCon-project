import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Trash2, Clock, MapPin, Tag, MessageSquare, Briefcase, Book, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Reusable Delete Confirmation Modal
const DeleteConfirmationModal = ({ item, onConfirm, onCancel, type }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
        <p className="mt-4 text-gray-600">
          Are you sure you want to delete this {type === 'lost' ? 'lost item' : 'found item'} "{item.title || item.item_name}"? This action cannot be undone.
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

const LostAndFound = () => {
  const { userId, userName, userRole } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'lost', 'found'

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/lostitems');
      if (!response.ok) {
        throw new Error('Failed to fetch lost and found items');
      }
      const data = await response.json();
      setItems(data);
    } catch (e) {
      console.error("Error fetching items:", e);
      setError(`Failed to load items. Please ensure the backend server is running. Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    // FIX: Add a safeguard (|| '') to handle potential undefined values from the API
    const matchesSearch = (item.title || item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.status === filterType || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDeleteItem = async (itemId) => {
    try {
      const response = await fetch(`/api/lostitems/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete item');
      }

      fetchItems(); // Re-fetch to update list
      setShowDeleteConfirm(null);
    } catch (e) {
      console.error("Error deleting item:", e);
      setError(`Failed to delete item: ${e.message}`);
    }
  };

  const PostItemModal = () => {
    const [formData, setFormData] = useState({
      item_name: '',
      description: '',
      location: '',
      type: 'lost', // Default to lost
      contact_info: '',
      image_url: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (key === 'image_url') {
          if (formData[key]) {
            dataToSend.append('image', formData[key]); // Use 'image' as the field name for the backend
          }
        } else {
          dataToSend.append(key, formData[key]);
        }
      }
      dataToSend.append('user_name', userName || 'Anonymous');
      dataToSend.append('user_id', userId);

      // Debug: Log what's being sent
      console.log('Form data being sent:');
      for (let [key, value] of dataToSend.entries()) {
        console.log(key, ':', value);
      }

      try {
        const response = await fetch('/api/lostitems', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: dataToSend,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to post item');
        }

        fetchItems();
        setShowPostModal(false);
      } catch (e) {
        console.error("Error posting item:", e);
        setError(`Failed to post item: ${e.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="relative w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl max-h-[90vh]">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Post New Item</h2>
            <button onClick={() => setShowPostModal(false)} className="rounded-lg p-2 transition-colors hover:bg-gray-300">
              <X className="h-5 w-5 text-black" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Item Name *</label>
              <input
                type="text"
                required
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 placeholder-shown:text-gray-500"
                placeholder="e.g., Black leather wallet"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 placeholder-shown:text-gray-500"
                placeholder="Describe the item in detail, including any unique marks or contents."
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Location *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 placeholder-shown:text-gray-500"
                  placeholder="e.g., Campus Library, Room 205"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Item Status *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contact Information *</label>
              <input
                type="text"
                required
                value={formData.contact_info}
                onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                className="text-black w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 placeholder-shown:text-gray-500"
                placeholder="e.g., your.email@university.edu or phone number"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Upload Image (Optional)</label>
              <input
                type="file"
                accept="image/*"
                name="image"
                onChange={(e) => setFormData({ ...formData, image_url: e.target.files[0] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
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
                {isSubmitting ? 'Posting...' : 'Post Item'}
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
      <header className="bg-gradient-to-r from-teal-500 to-cyan-600 py-16 text-white text-center shadow-lg">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Lost & Found
          </h1>
          <p className="mt-4 text-xl opacity-90">
            Help your community by reporting lost and found items.
          </p>
          <button
            onClick={() => setShowPostModal(true)}
            className="mt-10 flex items-center justify-center mx-auto rounded-full bg-white px-8 py-4 text-lg font-semibold text-blue-700 shadow-xl transition-transform transform hover:scale-105 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <Plus className="mr-3 h-6 w-6" />
            Post New Item
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
                placeholder="Search items by name, description, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              />
            </div>

            <div className="w-full md:w-auto">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 w-full"
              >
                <option value="all">All Items</option>
                <option value="lost">Lost Items</option>
                <option value="found">Found Items</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center text-gray-500 text-lg">Loading items...</div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item) => (
              <div key={item._id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-48 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {item.image || item.image_url ? (
                    <img
                      src={item.image ? item.image : item.image_url}
                      alt={item.title || item.item_name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x200/e2e8f0/64748b?text=Item+Image` }}
                    />
                  ) : (
                    <Book className="w-24 h-24 text-gray-400 opacity-70" />
                  )}
                  <div className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${(item.status || item.type) === 'lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                    {(item.status || item.type) === 'lost' ? 'Lost' : 'Found'}
                  </div>
                  {(item.user_id === userId || item.userId === userId || userRole === 'admin') && (
                    <button
                      onClick={() => setShowDeleteConfirm(item)}
                      className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      title="Delete this item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{item.title || item.item_name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{item.description}</p>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{item.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Posted {new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between border-t pt-4 mt-4">
                    <span className="text-sm text-gray-500">
                      Posted by: <span className="font-semibold text-gray-700">{item.reportedBy || item.user_name}</span>
                    </span>
                    <a
                      href={`mailto:${item.contactEmail || item.contact_info}`} // Use contactEmail from backend or fallback to contact_info
                      className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Contact
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Book className="mx-auto h-20 w-20 text-gray-400 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">Try adjusting your search or be the first to post an item!</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {showPostModal && <PostItemModal />}
      {showDeleteConfirm && (
        <DeleteConfirmationModal
          item={showDeleteConfirm}
          onConfirm={() => handleDeleteItem(showDeleteConfirm._id)}
          onCancel={() => setShowDeleteConfirm(null)}
          type={showDeleteConfirm.type}
        />
      )}
    </div>
  );
};

export default LostAndFound;
