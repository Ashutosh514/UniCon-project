import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Trash2, Clock, MapPin, MessageSquare, Book } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';


const API = "https://unicon-project-2.onrender.com";

// Reusable Delete Confirmation Modal
const DeleteConfirmationModal = ({ item, onConfirm, onCancel, type }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
        <p className="mt-4 text-gray-600">
          Are you sure you want to delete this {type === 'lost' ? 'lost item' : 'found item'} "{item.title || item.item_name}"?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg border px-4 py-2 font-semibold text-gray-700">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">
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
  const [filterType, setFilterType] = useState('all');

  // --------------------- FETCH ITEMS ---------------------
  const fetchItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/api/lostitems`);
      if (!response.ok) throw new Error('Failed to fetch lost and found items');

      const data = await response.json();
      setItems(data);
    } catch (e) {
      console.error("Error fetching items:", e);
      setError(`Failed to load items: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // --------------------- FILTER ITEMS ---------------------
  const filteredItems = items.filter((item) => {
    const text = (item.title || item.item_name || item.description || '').toLowerCase();
    const matchesSearch = text.includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType || item.status === filterType;
    return matchesSearch && matchesType;
  });

  // --------------------- DELETE ITEM ---------------------
  const handleDeleteItem = async (itemId) => {
    try {
      const response = await fetch(`${API}/api/lostitems/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Delete failed");
      }

      fetchItems();
      setShowDeleteConfirm(null);
    } catch (e) {
      setError(`Failed to delete: ${e.message}`);
    }
  };

  // --------------------- POST ITEM MODAL ---------------------
  const PostItemModal = () => {
    const [formData, setFormData] = useState({
      item_name: '',
      description: '',
      location: '',
      type: 'lost',
      contact_info: '',
      image_url: null,
    });

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);

      const dataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'image_url' && formData[key]) {
          dataToSend.append("image", formData[key]);
        } else {
          dataToSend.append(key, formData[key]);
        }
      });

      dataToSend.append("user_id", userId);
      dataToSend.append("user_name", userName);

      try {
        const response = await fetch(`${API}/api/lostitems`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: dataToSend,
        });

        if (!response.ok) throw new Error("Failed to post");

        fetchItems();
        setShowPostModal(false);
      } catch (e) {
        setError("Failed to post: " + e.message);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-lg">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">Post New Item</h2>
            <button onClick={() => setShowPostModal(false)}>
              <X className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="w-full border p-2 rounded" required placeholder="Item name"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
            />

            <textarea className="w-full border p-2 rounded" required placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <input className="w-full border p-2 rounded" required placeholder="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />

            <select className="w-full border p-2 rounded" value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>

            <input className="w-full border p-2 rounded" required placeholder="Contact Info"
              value={formData.contact_info}
              onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
            />

            <input type="file" accept="image/*"
              onChange={(e) => setFormData({ ...formData, image_url: e.target.files[0] })}
            />

            <button disabled={submitting} className="w-full bg-blue-600 text-white py-2 rounded">
              {submitting ? "Posting..." : "Post Item"}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // --------------------- UI RENDER ---------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-teal-500 to-cyan-600 py-16 text-white text-center shadow-lg">
        <h1 className="text-4xl font-extrabold">Lost & Found</h1>
        <p className="mt-2 text-lg opacity-90">Help your community by reporting lost and found items</p>

        <button
          onClick={() => setShowPostModal(true)}
          className="mt-6 bg-white text-blue-700 px-6 py-3 rounded-full shadow hover:bg-gray-200"
        >
          <Plus className="inline-block mr-2" /> Post New Item
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-6">
        {/* ERROR */}
        {error && <div className="bg-red-200 text-red-700 p-3 rounded">{error}</div>}

        {/* SEARCH + FILTER */}
        <div className="bg-white rounded-xl p-4 shadow mb-6 flex gap-4">
          <input
            placeholder="Search items..."
            className="flex-1 border p-2 rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="border p-2 rounded"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </div>

        {/* ITEMS GRID */}
        {loading ? (
          <p>Loading...</p>
        ) : filteredItems.length === 0 ? (
          <p>No items found</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div key={item._id} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="relative h-48 bg-gray-200">
                  {item.image || item.image_url ? (
                    <img
                      src={item.image || item.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Book className="w-24 h-24 text-gray-400 mx-auto mt-10" />
                  )}

                  {(item.user_id === userId || userRole === 'admin') && (
                    <button
                      onClick={() => setShowDeleteConfirm(item)}
                      className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg">{item.title || item.item_name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>

                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {item.location}
                  </div>

                  <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4" />
                    {new Date(item.timestamp).toLocaleDateString()}
                  </div>

                  <div className="mt-4 border-t pt-2 flex justify-between">
                    <span className="text-sm">
                      Posted by: <b>{item.reportedBy || item.user_name}</b>
                    </span>

                    <a
                      href={`mailto:${item.contact_info}`}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      <MessageSquare className="inline-block w-4 h-4 mr-1" />
                      Contact
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODALS */}
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
