const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    category: {
        type: String,
        required: true,
        enum: ['Mathematics', 'Physics', 'Computer Science', 'Chemistry', 'Biology', 'Literature', 'History', 'Other']
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: 50
    }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    authorName: {
        type: String,
        required: true
    },
    votes: {
        upvotes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        downvotes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    answers: [{
        answer: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        authorName: {
            type: String,
            required: true
        },
        isAccepted: {
            type: Boolean,
            default: false
        },
        votes: {
            upvotes: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }],
            downvotes: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }]
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['open', 'answered', 'closed'],
        default: 'open'
    },
    isResolved: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Virtual for vote count
questionSchema.virtual('voteCount').get(function () {
    return this.votes.upvotes.length - this.votes.downvotes.length;
});

// Virtual for answer count
questionSchema.virtual('answerCount').get(function () {
    return this.answers.length;
});

// Index for search
questionSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Question', questionSchema);
