const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    fileUrl: {
        type: String,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    }
}, {
    timestamps: true
});

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: messageSchema,
        default: null
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: new Map()
    },
    isActive: {
        type: Boolean,
        default: true
    },
    messages: [messageSchema]
}, {
    timestamps: true
});

// Virtual for getting the other participant in a 1-on-1 chat
chatSchema.virtual('otherParticipant').get(function () {
    // This would need to be implemented based on the current user context
    return this.participants;
});

// Method to mark messages as read for a specific user
chatSchema.methods.markAsRead = function (userId) {
    this.messages.forEach(message => {
        if (message.sender.toString() !== userId.toString() && !message.isRead) {
            message.isRead = true;
            message.readAt = new Date();
        }
    });

    // Reset unread count for this user
    this.unreadCount.set(userId.toString(), 0);

    return this.save();
};

// Method to add a message to the chat
chatSchema.methods.addMessage = function (senderId, content, messageType = 'text', fileUrl = null) {
    const message = {
        sender: senderId,
        content,
        messageType,
        fileUrl,
        isRead: false
    };

    this.messages.push(message);
    this.lastMessage = message;

    // Update unread count for other participants
    this.participants.forEach(participantId => {
        if (participantId.toString() !== senderId.toString()) {
            const currentCount = this.unreadCount.get(participantId.toString()) || 0;
            this.unreadCount.set(participantId.toString(), currentCount + 1);
        }
    });

    return this.save();
};

// Index for efficient querying
chatSchema.index({ participants: 1, updatedAt: -1 });
chatSchema.index({ 'lastMessage.createdAt': -1 });

module.exports = mongoose.model('Chat', chatSchema);
