const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    videoUrl: {
        type: String,
        required: true,
    },
    thumbnailUrl: {
        type: String,
        default: '',
    },
    type: {
        type: String,
        required: true,
        enum: ['practical', 'live', 'video'],
    },
    userId: {
        type: String,
        required: true,
    },
    postedBy: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Number,
        default: Date.now,
    },
});

module.exports = mongoose.model('Skill', SkillSchema);
