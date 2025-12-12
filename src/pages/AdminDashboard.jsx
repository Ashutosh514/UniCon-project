import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
    const { userRole } = useAuth();
    const [items, setItems] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userRole !== 'admin') return;
        fetchPending();
        fetchPendingPosts();
    }, [userRole]);

    const fetchPending = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/moderation/pending', { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Failed to fetch pending items');
            const data = await res.json();
            setItems(data.content || []);
        } catch (err) {
            setError(err.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingPosts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/postreviews/pending', { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Failed to fetch pending posts');
            const data = await res.json();
            setPosts(data.reviews || []);
        } catch (err) {
            setError(err.message || 'Failed to load posts');
        } finally {
            setLoading(false);
        }
    };

    const takeAction = async (reviewId, action) => {
        if (!confirm(`Are you sure you want to ${action} this content?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/moderation/review/${reviewId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Action failed');
            // refresh list
            fetchPending();
        } catch (err) {
            alert(err.message || 'Action failed');
        }
    };

    const takePostAction = async (reviewId, action) => {
        if (!confirm(`Are you sure you want to ${action} this post?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/postreviews/review/${reviewId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Action failed');
            fetchPendingPosts();
            fetchPending();
        } catch (err) {
            alert(err.message || 'Action failed');
        }
    };

    if (userRole !== 'admin') return <div className="p-8">Access denied: Admins only</div>;

    return (
        <div className="p-6">
            <h2 className="text-2xl text-black font-bold mb-4">Admin Moderation Dashboard</h2>
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-600">{error}</div>}
            <div className="space-y-4 text-gray-600">
                {items.length === 0 && <div>No content pending review.</div>}
                {items.map(item => (
                    <div key={item._id} className="p-3 bg-white rounded shadow">
                        <div className="flex justify-between">
                            <div>
                                <div className="font-semibold">{item.originalFileName || item.filePath}</div>
                                {/* Image preview for ContentReview items */}
                                {item.filePath && (item.filePath.endsWith('.jpg') || item.filePath.endsWith('.jpeg') || item.filePath.endsWith('.png') || item.filePath.endsWith('.gif')) && (
                                    <div className="mt-2">
                                        <img src={item.filePath.startsWith('/') ? item.filePath : item.filePath} alt={item.originalFileName || 'uploaded'} className="max-w-xs max-h-48 object-cover rounded" />
                                    </div>
                                )}
                                <div className="text-sm text-gray-600">Uploaded by: {item.uploadedBy?.fullName || item.uploadedBy?.email}</div>
                                <div className="text-sm text-gray-500">Status: {item.status} | Action: {item.action}</div>
                            </div>
                            <div className="space-x-2">
                                <button className="px-3 py-1 bg-green-500 text-white rounded" onClick={() => takeAction(item._id, 'approve')}>Approve</button>
                                <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => takeAction(item._id, 'quarantine')}>Quarantine</button>
                                <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => takeAction(item._id, 'reject')}>Reject</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <h3 className="text-xl text-black font-semibold mt-6 mb-3">Pending Posts (Lost/Skill/Notes)</h3>
            <div className="space-y-4 text-gray-700">
                {posts.length === 0 && <div>No posts pending review.</div>}
                {posts.map(p => (
                    <div key={p._id} className="p-3 bg-white rounded shadow">
                        <div className="flex justify-between">
                            <div>
                                <div className="font-semibold">Type: {p.type}</div>
                                {/* Image/thumbnail preview for PostReview payloads */}
                                {(() => {
                                    const img = p.payload?.image || p.payload?.thumbnailUrl || p.payload?.fileUrl || p.payload?.imageUrl;
                                    if (img) {
                                        return (
                                            <div className="mt-2">
                                                <img src={img.startsWith('/') ? img : img} alt={`preview-${p._id}`} className="max-w-xs max-h-48 object-cover rounded" />
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                <div className="text-sm text-gray-600">Submitted by: {p.uploadedBy?.fullName || p.uploadedBy?.email}</div>
                                <div className="text-sm text-gray-500">Status: {p.status}</div>
                                <pre className="text-xs mt-2 max-h-40 overflow-auto">{JSON.stringify(p.payload, null, 2)}</pre>
                            </div>
                            <div className="space-x-2">
                                <button className="px-3 py-1 bg-green-500 text-white rounded" onClick={() => takePostAction(p._id, 'approve')}>Approve</button>
                                <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => takePostAction(p._id, 'reject')}>Reject</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
