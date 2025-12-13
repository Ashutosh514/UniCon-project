import React, { useState, useEffect } from 'react';
import {
    Shield, Eye, Check, X, AlertTriangle, Clock,
    User, FileImage, BarChart3, Filter, Search, RefreshCw
} from 'lucide-react';

const ContentModerationDashboard = () => {

    const API = "https://unicon-project-2.onrender.com";

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

    // ---------------------- FETCH CONTENT ----------------------
    const fetchContent = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams(filters);

            const response = await fetch(`${API}/api/moderation/pending?${queryParams}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) throw new Error('Failed to fetch content');

            const data = await response.json();
            setContent(data.content || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ---------------------- FETCH STATISTICS ----------------------
    const fetchStats = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API}/api/moderation/stats`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch statistics');

            const data = await response.json();
            setStats(data);

        } catch (err) {
            console.error("Stats error:", err);
        }
    };

    useEffect(() => {
        fetchContent();
        fetchStats();
    }, [filters]);

    // ---------------------- REVIEW ACTION ----------------------
    const reviewContent = async (reviewId, action) => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(`${API}/api/moderation/review/${reviewId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action,
                    notes: reviewNotes
                })
            });

            if (!response.ok) throw new Error("Failed to review content");

            fetchContent();
            setSelectedContent(null);
            setReviewNotes("");

        } catch (err) {
            setError(err.message);
        }
    };

    // Helpers
    const getRiskColor = (risk) =>
        risk === "high" ? "text-red-500 bg-red-100" :
            risk === "medium" ? "text-yellow-500 bg-yellow-100" :
                risk === "low" ? "text-green-500 bg-green-100" :
                    "text-gray-500 bg-gray-100";

    const getStatusColor = (status) =>
        status === "approved" ? "text-green-500 bg-green-100" :
            status === "rejected" ? "text-red-500 bg-red-100" :
                status === "quarantined" ? "text-yellow-500 bg-yellow-100" :
                    status === "pending" ? "text-blue-500 bg-blue-100" :
                        "text-gray-500 bg-gray-100";

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 Bytes";
        const sizes = ["Bytes", "KB", "MB", "GB"];
        let i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    const formatDate = (date) => new Date(date).toLocaleString();

    // ---------------------- UI ----------------------
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-3">
                        <Shield className="h-8 w-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900">Content Moderation Dashboard</h1>
                    </div>
                    <button
                        onClick={fetchContent}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </button>
                </div>

                {/* STAT CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { icon: Clock, label: "Pending", value: stats.statusStats?.find(s => s._id === "pending")?.count || 0, color: "text-blue-500" },
                        { icon: Check, label: "Approved", value: stats.statusStats?.find(s => s._id === "approved")?.count || 0, color: "text-green-500" },
                        { icon: X, label: "Rejected", value: stats.statusStats?.find(s => s._id === "rejected")?.count || 0, color: "text-red-500" },
                        { icon: AlertTriangle, label: "High Risk", value: stats.riskStats?.find(s => s._id === "high")?.count || 0, color: "text-yellow-500" },
                    ].map((card, i) => (
                        <div key={i} className="bg-white p-6 shadow rounded-lg flex items-center">
                            <card.icon className={`h-8 w-8 ${card.color}`} />
                            <div className="ml-4">
                                <p className="text-sm text-gray-500">{card.label}</p>
                                <p className="text-2xl font-bold">{card.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* FILTERS */}
                <div className="bg-white p-6 shadow rounded-lg mb-6">
                    <div className="flex gap-4">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                            className="border border-gray-300 rounded-md px-3 py-2"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="quarantined">Quarantined</option>
                        </select>

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

                {/* CONTENT LIST */}
                <div className="bg-white rounded-lg shadow">
                    <div className="border-b px-6 py-4">
                        <h2 className="text-lg font-semibold">Content Review Queue</h2>
                    </div>

                    {/* LOADING */}
                    {loading ? (
                        <div className="flex justify-center py-12 text-gray-500">
                            <RefreshCw className="animate-spin h-8 w-8" /> Loading...
                        </div>
                    ) : error ? (
                        <div className="flex justify-center py-12 text-red-500">{error}</div>
                    ) : content.length === 0 ? (
                        <div className="flex justify-center py-12 text-gray-500">No content pending review</div>
                    ) : (
                        <div className="divide-y">
                            {content.map((item) => (
                                <div key={item._id} className="p-6 hover:bg-gray-50">
                                    <div className="flex items-start space-x-4">
                                        
                                        {/* Thumbnail */}
                                        <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                                            <FileImage className="h-8 w-8 text-gray-400" />
                                        </div>

                                        {/* DETAILS */}
                                        <div className="flex-1">
                                            <h3 className="text-lg font-medium">{item.originalFileName}</h3>

                                            <div className="flex gap-2 mt-2">
                                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                                <span className={`px-2 py-1 rounded-full text-xs ${getRiskColor(item.moderationResults?.riskAssessment?.overallRisk)}`}>
                                                    {item.moderationResults?.riskAssessment?.overallRisk || "Unknown"} risk
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-500 mt-2">
                                                Uploaded by: {item.uploadedBy?.fullName || "Unknown"} •{" "}
                                                {formatFileSize(item.fileSize)} • {formatDate(item.createdAt)}
                                            </p>
                                        </div>

                                        {/* ACTIONS */}
                                        <div className="flex flex-shrink-0 gap-2">
                                            <button
                                                onClick={() => setSelectedContent(item)}
                                                className="px-3 py-1 bg-blue-600 text-white rounded"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => reviewContent(item._id, "approve")}
                                                className="px-3 py-1 bg-green-600 text-white rounded"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => reviewContent(item._id, "reject")}
                                                className="px-3 py-1 bg-red-600 text-white rounded"
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

                {/* MODAL */}
                {selectedContent && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg max-w-4xl w-full p-6">

                            {/* Header */}
                            <div className="flex justify-between items-center border-b pb-4 mb-4">
                                <h2 className="text-xl font-semibold">Review Content</h2>
                                <button onClick={() => setSelectedContent(null)}>
                                    <X className="h-6 w-6 text-gray-500" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* File Details */}
                                <div>
                                    <h3 className="font-medium text-lg mb-2">File Information</h3>
                                    <p>{selectedContent.originalFileName}</p>
                                    <p className="text-sm text-gray-500">{formatFileSize(selectedContent.fileSize)}</p>
                                </div>

                                {/* Review Notes */}
                                <div>
                                    <h3 className="font-medium text-lg mb-2">Review Notes</h3>
                                    <textarea
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        className="w-full border rounded p-2 text-sm"
                                        rows={4}
                                        placeholder="Add notes for reviewer..."
                                    />
                                </div>

                            </div>

                            {/* Footer Buttons */}
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    className="px-4 py-2 bg-gray-200 rounded"
                                    onClick={() => setSelectedContent(null)}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="px-4 py-2 bg-red-600 text-white rounded"
                                    onClick={() => reviewContent(selectedContent._id, "reject")}
                                >
                                    Reject
                                </button>

                                <button
                                    className="px-4 py-2 bg-yellow-600 text-white rounded"
                                    onClick={() => reviewContent(selectedContent._id, "quarantine")}
                                >
                                    Quarantine
                                </button>

                                <button
                                    className="px-4 py-2 bg-green-600 text-white rounded"
                                    onClick={() => reviewContent(selectedContent._id, "approve")}
                                >
                                    Approve
                                </button>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ContentModerationDashboard;
