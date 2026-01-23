import React, { useState, useEffect } from 'react';
import {
    Shield,
    Eye,
    Check,
    X,
    AlertTriangle,
    Clock,
    User,
    FileImage,
    BarChart3,
    Filter,
    Search,
    RefreshCw,
    Briefcase
} from 'lucide-react';


const API = "https://unicon-project-2.onrender.com";

const ContentModerationDashboard = () => {
    const [content, setContent] = useState([]);
    const [posts, setPosts] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'files', 'posts'
    const [filters, setFilters] = useState({
        status: 'all',
        riskLevel: 'all',
        page: 1,
        limit: 20
    });
    const [selectedContent, setSelectedContent] = useState(null);
    const [reviewNotes, setReviewNotes] = useState('');

    // Fetch content data (file uploads)
    const fetchContent = async () => {
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`${API}/api/moderation/pending?${queryParams}`);

            if (!response.ok) {
                throw new Error('Failed to fetch content');
            }

            const data = await response.json();
            setContent(data.content || []);
        } catch (err) {
            console.error('Error fetching content:', err);
        }
    };

    // Fetch posts for review (skills, resources, etc)
    const fetchPosts = async () => {
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                page: filters.page,
                limit: filters.limit
            });
            const response = await fetch(`${API}/api/postReview/pending-paginated?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch posts for review');
            }

            const data = await response.json();
            setPosts(data.reviews || []);
        } catch (err) {
            console.error('Error fetching posts:', err);
        }
    };

    // Combine and sort all items
    useEffect(() => {
        if (activeTab === 'all') {
            const contentWithType = content.map(item => ({ ...item, itemType: 'file' }));
            const postsWithType = posts.map(item => ({ ...item, itemType: 'post' }));
            const combined = [...contentWithType, ...postsWithType].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            setAllItems(combined);
        } else if (activeTab === 'files') {
            setAllItems(content.map(item => ({ ...item, itemType: 'file' })));
        } else if (activeTab === 'posts') {
            setAllItems(posts.map(item => ({ ...item, itemType: 'post' })));
        }
    }, [content, posts, activeTab]);

    // Fetch statistics
    const fetchStats = async () => {
        try {
            const response = await fetch(`${API}/api/moderation/stats`);

            if (!response.ok) {
                throw new Error('Failed to fetch statistics');
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchContent(), fetchPosts(), fetchStats()]).finally(() => setLoading(false));
    }, [filters]);

    // Review content action (for files)
    const reviewContent = async (reviewId, action) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/moderation/review/${reviewId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action,
                    notes: reviewNotes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to review content');
            }

            // Refresh content list
            fetchContent();
            setSelectedContent(null);
            setReviewNotes('');
        } catch (err) {
            setError(err.message);
        }
    };

    // Review post action (for skills, resources, etc)
    const reviewPost = async (reviewId, action) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API}/api/postReview/review/${reviewId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action,
                    notes: reviewNotes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to review post');
            }

            // Refresh posts list
            fetchPosts();
            setSelectedContent(null);
            setReviewNotes('');
        } catch (err) {
            setError(err.message);
        }
    };

    // Unified review handler
    const handleReview = (item, action) => {
        if (item.itemType === 'file') {
            reviewContent(item._id, action);
        } else if (item.itemType === 'post') {
            reviewPost(item._id, action);
        }
    };

    // Get risk level color
    const getRiskColor = (riskLevel) => {
        switch (riskLevel) {
            case 'high': return 'text-red-500 bg-red-100';
            case 'medium': return 'text-yellow-500 bg-yellow-100';
            case 'low': return 'text-green-500 bg-green-100';
            default: return 'text-gray-500 bg-gray-100';
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'text-green-500 bg-green-100';
            case 'rejected': return 'text-red-500 bg-red-100';
            case 'quarantined': return 'text-yellow-500 bg-yellow-100';
            case 'pending': return 'text-blue-500 bg-blue-100';
            default: return 'text-gray-500 bg-gray-100';
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Shield className="h-8 w-8 text-blue-600" />
                            <h1 className="text-3xl font-bold text-gray-900">Content Moderation Dashboard</h1>
                        </div>
                        <button
                            onClick={() => { fetchContent(); fetchPosts(); fetchStats(); }}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <Clock className="h-8 w-8 text-blue-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.statusStats?.find(s => s._id === 'pending')?.count || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <Check className="h-8 w-8 text-green-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Approved</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.statusStats?.find(s => s._id === 'approved')?.count || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <X className="h-8 w-8 text-red-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Rejected</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.statusStats?.find(s => s._id === 'rejected')?.count || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <AlertTriangle className="h-8 w-8 text-yellow-500" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">High Risk</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.riskStats?.find(s => s._id === 'high')?.count || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'all'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            All Items
                        </button>
                        <button
                            onClick={() => setActiveTab('files')}
                            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'files'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            File Uploads
                        </button>
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'posts'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Posts (Skills, Resources, etc)
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                                className="border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="quarantined">Quarantined</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <select
                                value={filters.riskLevel}
                                onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value, page: 1 })}
                                className="border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="all">All Risk Levels</option>
                                <option value="high">High Risk</option>
                                <option value="medium">Medium Risk</option>
                                <option value="low">Low Risk</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content List */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Content Review Queue</h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                            <span className="ml-2 text-gray-500">Loading content...</span>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-12">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                            <span className="ml-2 text-red-500">{error}</span>
                        </div>
                    ) : allItems.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Check className="h-8 w-8 text-green-500" />
                            <span className="ml-2 text-gray-500">No content pending review</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {allItems.map((item) => (
                                <div key={item._id} className="p-6 hover:bg-gray-50">
                                    <div className="flex items-start space-x-4">
                                        {/* Item Preview */}
                                        <div className="flex-shrink-0">
                                            {item.itemType === 'file' ? (
                                                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                                                    <FileImage className="h-8 w-8 text-gray-400" />
                                                </div>
                                            ) : (
                                                <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <Briefcase className="h-8 w-8 text-blue-600" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Item Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-medium text-gray-900 truncate">
                                                    {item.itemType === 'file' ? item.originalFileName : `${item.type} - ${item.payload?.title || 'N/A'}`}
                                                </h3>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                    {item.itemType === 'file' && (
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(item.moderationResults?.riskAssessment?.overallRisk)}`}>
                                                            {item.moderationResults?.riskAssessment?.overallRisk || 'unknown'} risk
                                                        </span>
                                                    )}
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                                                        {item.itemType === 'file' ? 'File' : `${item.type}`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-2 text-sm text-gray-500">
                                                {item.itemType === 'file' ? (
                                                    <>
                                                        <p>Uploaded by: {item.uploadedBy?.fullName || 'Unknown'}</p>
                                                        <p>Size: {formatFileSize(item.fileSize)} • {formatDate(item.createdAt)}</p>
                                                        {item.moderationResults?.aiAnalysis?.overallNsfwScore && (
                                                            <p>NSFW Score: {(item.moderationResults.aiAnalysis.overallNsfwScore * 100).toFixed(1)}%</p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <p>Posted by: {item.uploadedBy?.fullName || 'Unknown'}</p>
                                                        <p>{item.payload?.description?.substring(0, 100) || 'No description'}...</p>
                                                        <p>Category: {item.payload?.category || 'N/A'} • {formatDate(item.createdAt)}</p>
                                                    </>
                                                )}
                                            </div>

                                            {/* Risk Factors (for files) */}
                                            {item.itemType === 'file' && item.moderationResults?.riskAssessment?.factors?.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-sm font-medium text-gray-700">Risk Factors:</p>
                                                    <ul className="text-sm text-gray-500 list-disc list-inside">
                                                        {item.moderationResults.riskAssessment.factors.map((factor, index) => (
                                                            <li key={index}>{factor}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex-shrink-0 flex space-x-2">
                                            <button
                                                onClick={() => setSelectedContent(item)}
                                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleReview(item, 'approve')}
                                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleReview(item, 'reject')}
                                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Review Modal */}
                {selectedContent && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {selectedContent.itemType === 'file' ? 'File Review' : 'Post Review'}
                                    </h2>
                                    <button
                                        onClick={() => setSelectedContent(null)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {selectedContent.itemType === 'file' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* File Preview */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">File Preview</h3>
                                            <div className="border border-gray-200 rounded-lg p-4">
                                                {selectedContent.fileType === 'image' ? (
                                                    <div className="text-center">
                                                        <FileImage className="h-32 w-32 mx-auto text-gray-400" />
                                                        <p className="mt-2 text-sm text-gray-500">Image preview not available</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <FileImage className="h-32 w-32 mx-auto text-gray-400" />
                                                        <p className="mt-2 text-sm text-gray-500">Video preview not available</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* File Moderation Details */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Moderation Details</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">File Information</p>
                                                    <p className="text-sm text-gray-500">
                                                        {selectedContent.originalFileName} • {formatFileSize(selectedContent.fileSize)}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Risk Assessment</p>
                                                    <p className="text-sm text-gray-500">
                                                        {selectedContent.moderationResults?.riskAssessment?.overallRisk || 'Unknown'} risk
                                                    </p>
                                                </div>

                                                {selectedContent.moderationResults?.aiAnalysis?.overallNsfwScore && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">NSFW Score</p>
                                                        <p className="text-sm text-gray-500">
                                                            {(selectedContent.moderationResults.aiAnalysis.overallNsfwScore * 100).toFixed(1)}%
                                                        </p>
                                                    </div>
                                                )}

                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Review Notes</p>
                                                    <textarea
                                                        value={reviewNotes}
                                                        onChange={(e) => setReviewNotes(e.target.value)}
                                                        className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                        rows={3}
                                                        placeholder="Add review notes..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Post Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Post Information</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Type</p>
                                                        <p className="text-sm text-gray-500 capitalize">{selectedContent.type}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Title</p>
                                                        <p className="text-sm text-gray-500">{selectedContent.payload?.title || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Category</p>
                                                        <p className="text-sm text-gray-500">{selectedContent.payload?.category || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Posted By</p>
                                                        <p className="text-sm text-gray-500">{selectedContent.uploadedBy?.fullName || 'Unknown'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
                                                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                                                    {selectedContent.payload?.description || 'No description provided'}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Review Notes</p>
                                            <textarea
                                                value={reviewNotes}
                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                                                rows={3}
                                                placeholder="Add review notes..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="mt-6 flex justify-end space-x-3">
                                    <button
                                        onClick={() => setSelectedContent(null)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleReview(selectedContent, 'reject')}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                                    >
                                        Reject
                                    </button>
                                    {selectedContent.itemType === 'file' && (
                                        <button
                                            onClick={() => handleReview(selectedContent, 'quarantine')}
                                            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors"
                                        >
                                            Quarantine
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleReview(selectedContent, 'approve')}
                                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentModerationDashboard;
