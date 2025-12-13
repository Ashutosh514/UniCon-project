import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Plus, X, Download, MessageSquare, Trash2, Search, Book } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = "https://unicon-project-2.onrender.com";

const DeleteConfirmationModal = ({ item, onConfirm, onCancel, type }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
      <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
      <p className="mt-4 text-gray-600">
        Are you sure you want to delete this {type === 'notes' ? 'note' : 'book'} "{item.title}"?
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onCancel} className="border px-4 py-2 rounded-lg">Cancel</button>
        <button onClick={onConfirm} className="bg-red-600 text-white px-4 py-2 rounded-lg">Delete</button>
      </div>
    </div>
  </div>
);

const NotesExchange = () => {
  const { userId, userName, userRole } = useAuth();
  const [resources, setResources] = useState([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categories = ['all', 'Lecture Notes', 'Textbooks', 'Study Guides', 'Past Papers', 'Reference Materials', 'Other'];

  // ⭐ FETCH FROM DEPLOYED BACKEND
  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/resources`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setResources(data);
    } catch (err) {
      setError("Could not load resources: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, []);

  // ⭐ FILTER SEARCH
  const filtered = resources.filter((r) => {
    const text = `${r.title} ${r.description} ${r.subject}`.toLowerCase();
    const matches = text.includes(searchTerm.toLowerCase());
    const categoryMatch = selectedCategory === 'all' || r.category === selectedCategory;
    const typeMatch = selectedType === 'all' || r.resourceType === selectedType;
    return matches && categoryMatch && typeMatch;
  });

  // ⭐ DELETE RESOURCE (Backend)
  const handleDeleteResource = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API}/api/resources/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Delete failed");

      fetchResources();
      setShowDeleteConfirm(null);
    } catch (err) {
      setError("Delete failed: " + err.message);
    }
  };

  // ⭐ POST MODAL
  const PostModal = () => {
    const [form, setForm] = useState({
      title: "",
      description: "",
      category: "",
      subject: "",
      resourceType: "notes",
      resourceFile: null,
      resourceImage: null,
      contactEmail: "",
      contactPhone: "",
    });

    const handleSubmit = async (e) => {
      e.preventDefault();

      const token = localStorage.getItem("token");
      const fd = new FormData();

      Object.keys(form).forEach((k) => {
        if (form[k]) fd.append(k, form[k]);
      });

      fd.append("postedBy", userName);
      fd.append("userId", userId);

      try {
        const res = await fetch(`${API}/api/resources`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: fd
        });

        if (!res.ok) throw new Error("Upload failed");

        fetchResources();
        setShowPostModal(false);
      } catch (err) {
        setError("Post failed: " + err.message);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-6 z-50">
        <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-xl">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">Post New Resource</h2>
            <button onClick={() => setShowPostModal(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="border p-2 w-full" placeholder="Title" required
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

            <textarea className="border p-2 w-full" placeholder="Description" required
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <select className="border p-2 w-full" required
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select Category</option>
              {categories.slice(1).map((c) => <option key={c}>{c}</option>)}
            </select>

            <input className="border p-2 w-full" placeholder="Subject" required
              value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />

            <select className="border p-2 w-full"
              value={form.resourceType} onChange={(e) => setForm({ ...form, resourceType: e.target.value })}>
              <option value="notes">Notes/File</option>
              <option value="book">Book Exchange</option>
            </select>

            {form.resourceType === "notes" ? (
              <input type="file" accept=".pdf,.doc,.docx" required
                onChange={(e) => setForm({ ...form, resourceFile: e.target.files[0] })} />
            ) : (
              <>
                <input type="file" accept="image/*"
                  onChange={(e) => setForm({ ...form, resourceImage: e.target.files[0] })} />

                <input className="border p-2 w-full" placeholder="Email" required
                  value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </>
            )}

            <button className="bg-blue-600 text-white w-full py-2 rounded-lg">Post Resource</button>
          </form>
        </div>
      </div>
    );
  };

  // ⭐ UI
  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 text-white text-center shadow-lg">
        <h1 className="text-4xl font-bold">Notes & Book Exchange</h1>
        <button
          onClick={() => setShowPostModal(true)}
          className="mt-6 bg-green-500 px-8 py-4 rounded-full font-semibold text-white"
        >
          <Plus className="inline-block mr-2" /> Post New Resource
        </button>
      </header>

      {/* SEARCH + FILTER */}
      <div className="max-w-6xl mx-auto mt-8 bg-white p-6 rounded-xl shadow flex gap-4">
        <input className="border p-2 flex-1 rounded-lg"
          placeholder="Search..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} />

        <select className="border p-2 rounded-lg"
          value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>

        <select className="border p-2 rounded-lg"
          value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="notes">Notes</option>
          <option value="book">Books</option>
        </select>
      </div>

      {/* GRID */}
      <div className="max-w-6xl mx-auto mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p>No resources found</p>
        ) : (
          filtered.map((r) => (
            <div key={r._id} className="bg-white rounded-xl overflow-hidden shadow">
              <div className="relative h-48 bg-gray-200">
                {r.imageUrl ? (
                  <img src={r.imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-20 h-20 text-gray-400 mx-auto mt-12" />
                )}

                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                  {r.resourceType}
                </div>

                {(r.userId === userId || userRole === "admin") && (
                  <button
                    onClick={() => setShowDeleteConfirm(r)}
                    className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg">{r.title}</h3>
                <p className="text-sm text-gray-600">{r.description}</p>

                <div className="mt-4 border-t pt-2 flex justify-between">
                  <span className="text-sm">By {r.postedBy}</span>

                  {r.resourceType === "notes" && (
                    <a
                      href={`${API}${r.fileUrl}`}
                      target="_blank"
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      <Download className="w-4 h-4 inline-block mr-1" />
                      Download
                    </a>
                  )}

                  {r.resourceType === "book" && (
                    <button
                      onClick={() =>
                        window.location.href = `mailto:${r.contactEmail}`
                      }
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      <MessageSquare className="w-4 h-4 inline-block mr-1" />
                      Contact
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODALS */}
      {showPostModal && <PostModal />}
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
