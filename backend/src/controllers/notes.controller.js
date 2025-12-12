const Note = require('../models/Note');

// @desc    Get all notes
// @route   GET /api/notes
// @access  Public
exports.getAllNotes = async (req, res) => {
    try {
        const notes = await Note.find();
        res.status(200).json(notes);
    } catch (error) {
        console.error("Error fetching notes:", error);
        res.status(500).json({ message: 'Server Error: Failed to fetch notes.' });
    }
};

// @desc    Create a new note
// @route   POST /api/notes
// @access  Private (requires auth)
const PostReview = require('../models/PostReview');
exports.createNote = async (req, res) => {
    try {
        const { title, content, postedBy, userId } = req.body;

        // Basic validation
        if (!title || !content) {
            return res.status(400).json({ message: 'Please provide all required fields.' });
        }

        const payload = { title, content, postedBy, userId: userId || req.userId };

        if (req.userRole === 'admin') {
            const newNote = new Note(payload);
            const savedNote = await newNote.save();
            return res.status(201).json(savedNote);
        }

        const postReview = new PostReview({ type: 'note', payload, uploadedBy: req.userId });
        await postReview.save();
        res.status(202).json({ message: 'Note submitted for moderation', reviewId: postReview._id });
    } catch (error) {
        console.error("Error creating note:", error);
        res.status(500).json({ message: 'Server Error: Failed to create note.' });
    }
};

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private (requires auth)
exports.deleteNote = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Allow owner or admin to delete the note
        if (note.userId !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'User not authorized to delete this note' });
        }

        await Note.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Note removed successfully' });
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).json({ message: 'Server Error: Failed to delete note.' });
    }
};
