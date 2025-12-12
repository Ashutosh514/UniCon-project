const express = require('express');
const router = express.Router();
const questionsController = require('../controllers/questions.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Create a new question
router.post('/', authMiddleware, questionsController.createQuestion);

// Get all questions
router.get('/', questionsController.getQuestions);

// Get a specific question by ID
router.get('/:id', questionsController.getQuestionById);

// Add an answer to a question
router.post('/:id/answers', authMiddleware, questionsController.addAnswer);

// Delete an answer (admin only)
router.delete('/:id/answers/:answerId', authMiddleware, questionsController.deleteAnswer);
// Fallback: allow deleting an answer via POST body (some clients or proxies strip bodies on DELETE)
router.post('/:id/answers/delete', authMiddleware, questionsController.deleteAnswer);

// Update question votes
router.post('/:id/vote', authMiddleware, questionsController.voteQuestion);

// Delete a question (only by author)
router.delete('/:id', authMiddleware, questionsController.deleteQuestion);

module.exports = router;
