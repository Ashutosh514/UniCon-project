/**
 * Content Moderation Dashboard
 * Layer 7: Admin tools for content review and management
 */

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
    RefreshCw
} from 'lucide-react';

const ContentModerationDashboard = () => {
    const [content, setContent] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        status: 'all',
        riskLevel: 'all',
        page: 1,
        limit: 20
    });
    const [selectedContent, setSelectedContent] = useState(null);
    const [reviewNotes, setReviewNotes] = useState('');

    // Fetch content data
    const fetchContent = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/moderation/pending?${queryParams}`);

            if (!response.ok) {
                throw new Error('Failed to fetch content');
            }

            const data = await response.json();
            setContent(data.content);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch statistics
    const fetchStats = async () => {
        try {
            const response = await fetch('/api/moderation/stats');

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
        fetchContent();
        fetchStats();
    }, [filters]);

    // Review content action
    const reviewContent = async (reviewId, action) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/moderation/review/${reviewId}`, {
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
                            onClick={fetchContent}
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
                    ) : content.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Check className="h-8 w-8 text-green-500" />
                            <span className="ml-2 text-gray-500">No content pending review</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {content.map((item) => (
                                <div key={item._id} className="p-6 hover:bg-gray-50">
                                    <div className="flex items-start space-x-4">
                                        {/* File Preview */}
                                        <div className="flex-shrink-0">
                                            {item.fileType === 'image' ? (
                                                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                                                    <FileImage className="h-8 w-8 text-gray-400" />
                                                </div>
                                            ) : (
                                                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                                                    <FileImage className="h-8 w-8 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-medium text-gray-900 truncate">
                                                    {item.originalFileName}
                                                </h3>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(item.moderationResults?.riskAssessment?.overallRisk)}`}>
                                                        {item.moderationResults?.riskAssessment?.overallRisk || 'unknown'} risk
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-2 text-sm text-gray-500">
                                                <p>Uploaded by: {item.uploadedBy?.fullName || 'Unknown'}</p>
                                                <p>Size: {formatFileSize(item.fileSize)} • {formatDate(item.createdAt)}</p>
                                                {item.moderationResults?.aiAnalysis?.overallNsfwScore && (
                                                    <p>NSFW Score: {(item.moderationResults.aiAnalysis.overallNsfwScore * 100).toFixed(1)}%</p>
                                                )}
                                            </div>

                                            {/* Risk Factors */}
                                            {item.moderationResults?.riskAssessment?.factors?.length > 0 && (
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
                                                onClick={() => reviewContent(item._id, 'approve')}
                                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => reviewContent(item._id, 'reject')}
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
                                    <h2 className="text-xl font-semibold text-gray-900">Content Review</h2>
                                    <button
                                        onClick={() => setSelectedContent(null)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
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

                                    {/* Moderation Details */}
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

                                {/* Action Buttons */}
                                <div className="mt-6 flex justify-end space-x-3">
                                    <button
                                        onClick={() => setSelectedContent(null)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => reviewContent(selectedContent._id, 'reject')}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => reviewContent(selectedContent._id, 'quarantine')}
                                        className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors"
                                    >
                                        Quarantine
                                    </button>
                                    <button
                                        onClick={() => reviewContent(selectedContent._id, 'approve')}
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


