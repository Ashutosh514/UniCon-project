const Question = require('../models/Question');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create a new question
exports.createQuestion = async (req, res) => {
    try {
        const { title, description, category, subject, tags } = req.body;
        const userId = req.userId;

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create new question
        const authorName = user.name || user.username || user.email || 'Anonymous';
        const question = new Question({
            title,
            description,
            category,
            subject,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            author: userId,
            authorName
        });

        await question.save();

        // Populate author details for response
        await question.populate('author', 'name username email');

        res.status(201).json({
            message: 'Question created successfully',
            question
        });

    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({
            message: 'Error creating question',
            error: error.message
        });
    }
};

// Get all questions with filtering and pagination
exports.getQuestions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (category && category !== 'all') {
            filter.category = category;
        }

        if (search) {
            filter.$text = { $search: search };
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query
        const questions = await Question.find(filter)
            .populate('author', 'name username email')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const total = await Question.countDocuments(filter);

        // Calculate vote counts and answer counts
        const questionsWithCounts = questions.map(q => ({
            ...q,
            voteCount: (q.votes?.upvotes?.length || 0) - (q.votes?.downvotes?.length || 0),
            answerCount: q.answers?.length || 0
        }));

        res.json({
            questions: questionsWithCounts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalQuestions: total,
                hasNext: skip + questions.length < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching questions:', error && error.stack ? error.stack : error);
        res.status(500).json({
            message: 'Error fetching questions',
            error: error.message || String(error)
        });
    }
};

// Get a single question by ID
exports.getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const question = await Question.findById(id)
            .populate('author', 'name username email')
            .populate('answers.author', 'name username email');

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Increment view count
        question.views += 1;
        await question.save();

        // Check if user has voted
        const userVote = question.votes.upvotes.includes(userId) ? 'upvote' :
            question.votes.downvotes.includes(userId) ? 'downvote' : null;

        res.json({
            question,
            userVote,
            voteCount: question.votes.upvotes.length - question.votes.downvotes.length,
            answerCount: question.answers.length
        });

    } catch (error) {
        console.error('Error fetching question:', error);
        res.status(500).json({
            message: 'Error fetching question',
            error: error.message
        });
    }
};

// Add an answer to a question
exports.addAnswer = async (req, res) => {
    try {
        const { id } = req.params;
        const { answer } = req.body;
        const userId = req.userId;

        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add answer
        const answerAuthorName = user.name || user.username || user.email || 'Anonymous';
        question.answers.push({
            answer,
            author: userId,
            authorName: answerAuthorName
        });

        // Update question status
        question.status = 'answered';
        await question.save();

        // Populate the new answer
        await question.populate('answers.author', 'name username email');

        res.json({
            message: 'Answer added successfully',
            question
        });

    } catch (error) {
        console.error('Error adding answer:', error);
        res.status(500).json({
            message: 'Error adding answer',
            error: error.message
        });
    }
};

// Vote on a question
exports.voteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body; // 'upvote' or 'downvote'
        const userId = req.userId;

        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Remove existing votes from this user
        question.votes.upvotes = question.votes.upvotes.filter(id => id.toString() !== userId);
        question.votes.downvotes = question.votes.downvotes.filter(id => id.toString() !== userId);

        // Add new vote
        if (voteType === 'upvote') {
            question.votes.upvotes.push(userId);
        } else if (voteType === 'downvote') {
            question.votes.downvotes.push(userId);
        }

        await question.save();

        res.json({
            message: 'Vote recorded successfully',
            voteCount: question.votes.upvotes.length - question.votes.downvotes.length
        });

    } catch (error) {
        console.error('Error voting on question:', error);
        res.status(500).json({
            message: 'Error recording vote',
            error: error.message
        });
    }
};

// Vote on an answer
exports.voteAnswer = async (req, res) => {
    try {
        const { questionId, answerId } = req.params;
        const { voteType } = req.body; // 'upvote' or 'downvote'
        const userId = req.userId;

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        const answer = question.answers.id(answerId);
        if (!answer) {
            return res.status(404).json({ message: 'Answer not found' });
        }

        // Remove existing votes from this user
        answer.votes.upvotes = answer.votes.upvotes.filter(id => id.toString() !== userId);
        answer.votes.downvotes = answer.votes.downvotes.filter(id => id.toString() !== userId);

        // Add new vote
        if (voteType === 'upvote') {
            answer.votes.upvotes.push(userId);
        } else if (voteType === 'downvote') {
            answer.votes.downvotes.push(userId);
        }

        await question.save();

        res.json({
            message: 'Vote recorded successfully',
            voteCount: answer.votes.upvotes.length - answer.votes.downvotes.length
        });

    } catch (error) {
        console.error('Error voting on answer:', error);
        res.status(500).json({
            message: 'Error recording vote',
            error: error.message
        });
    }
};

// Accept an answer
exports.acceptAnswer = async (req, res) => {
    try {
        const { questionId, answerId } = req.params;
        const userId = req.userId;

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Check if user is the question author
        if (question.author.toString() !== userId) {
            return res.status(403).json({ message: 'Only the question author can accept answers' });
        }

        // Unaccept all other answers
        question.answers.forEach(ans => {
            ans.isAccepted = false;
        });

        // Accept the selected answer
        const answer = question.answers.id(answerId);
        if (!answer) {
            return res.status(404).json({ message: 'Answer not found' });
        }

        answer.isAccepted = true;
        question.isResolved = true;
        question.status = 'closed';

        await question.save();

        res.json({
            message: 'Answer accepted successfully',
            question
        });

    } catch (error) {
        console.error('Error accepting answer:', error);
        res.status(500).json({
            message: 'Error accepting answer',
            error: error.message
        });
    }
};

// Delete a question (only by author)
exports.deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const question = await Question.findById(id);
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Allow admin or question author to delete question
        if (req.userRole !== 'admin' && question.author.toString() !== userId) {
            return res.status(403).json({ message: 'Only an admin or the question author can delete this question' });
        }

        await Question.findByIdAndDelete(id);

        res.json({ message: 'Question deleted successfully' });

    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({
            message: 'Error deleting question',
            error: error.message
        });
    }
};

// Delete an answer from a question (admin only)
exports.deleteAnswer = async (req, res) => {
    try {
        // support both :id and :questionId for flexibility
        const questionId = req.params.id || req.params.questionId;
        const answerId = req.params.answerId || req.body.answerId;

        console.log('deleteAnswer called - questionId:', questionId, 'answerId:', answerId, 'userRole:', req.userRole);

        if (!questionId || !answerId) {
            console.warn('deleteAnswer missing params', { questionId, answerId });
            return res.status(400).json({ message: 'Missing questionId or answerId' });
        }

        // validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            console.warn('Invalid questionId provided to deleteAnswer:', questionId);
            return res.status(400).json({ message: 'Invalid question id' });
        }
        if (!mongoose.Types.ObjectId.isValid(answerId)) {
            console.warn('Invalid answerId provided to deleteAnswer:', answerId);
            return res.status(400).json({ message: 'Invalid answer id' });
        }

        const question = await Question.findById(questionId);
        if (!question) {
            console.warn('Question not found in deleteAnswer for id:', questionId);
            return res.status(404).json({ message: 'Question not found' });
        }

        // Only admin, the question author or the answer author can delete the answer
        const answer = question.answers.id(answerId);
        if (!answer) return res.status(404).json({ message: 'Answer not found' });
        const isQuestionAuthor = question.author && question.author.toString() === userId;
        const isAnswerAuthor = answer.author && answer.author.toString() === userId;
        if (req.userRole !== 'admin' && !isQuestionAuthor && !isAnswerAuthor) {
            return res.status(403).json({ message: 'Only an admin, the question author, or the answer author can delete this answer' });
        }

        // Remove answer by finding its index (works for subdocuments and plain objects)
        const idx = question.answers.findIndex(a => {
            try {
                return (a._id && a._id.toString() === answerId) || (a.id && a.id === answerId);
            } catch (e) {
                return false;
            }
        });
        if (idx === -1) return res.status(404).json({ message: 'Answer not found' });
        question.answers.splice(idx, 1);

        await question.save();

        // repopulate answer authors for the response
        await question.populate('answers.author', 'name username email');

        res.json({ message: 'Answer deleted', question });
    } catch (err) {
        console.error('Error deleting answer', err);
        res.status(500).json({ message: 'Error deleting answer', error: err.message });
    }
};
