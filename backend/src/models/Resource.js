    const mongoose = require('mongoose');

    const ResourceSchema = new mongoose.Schema({
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: { // e.g., "Notes", "Book", "Study Guide", "Past Paper"
            type: String,
            required: true,
        },
        subject: { // e.g., "Physics", "Calculus", "CS-101"
            type: String,
            required: true,
        },
        resourceType: { // To distinguish between notes (files) and books (exchange)
            type: String,
            required: true,
            enum: ['notes', 'book'],
        },
        fileUrl: { // For notes (PDFs, docs)
            type: String,
            default: '',
        },
        imageUrl: { // For book covers
            type: String,
            default: '',
        },
        contactEmail: { // For book exchange
            type: String,
            required: function() { return this.resourceType === 'book'; }, // Required only for books
        },
        contactPhone: { // Optional phone for book exchange
            type: String,
            default: '',
        },
        postedBy: { // User's full name
            type: String,
            required: true,
        },
        userId: { // ID of the user who posted
            type: String,
            required: true,
        },
        status: { // For books, e.g., 'available', 'exchanged'
            type: String,
            enum: ['available', 'exchanged'],
            default: 'available',
        },
        timestamp: {
            type: Number,
            default: Date.now,
        },
    });

    module.exports = mongoose.model('Resource', ResourceSchema);
    