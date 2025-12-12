const express = require('express');
const { getAllSkills, createSkill, deleteSkill } = require('../controllers/skills.controller');
const { processContentUpload } = require('../controllers/contentModeration.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const contentModerationMiddleware = require('../middlewares/contentModeration.middleware');
const uploadSkillThumbnail = require('../middlewares/uploadSkillThumbnail.middleware');

const router = express.Router();

router.get('/', getAllSkills);
// Apply content moderation only when a file is uploaded
router.post('/',
  authMiddleware,
  uploadSkillThumbnail.single('thumbnail'),
  contentModerationMiddleware, // Always apply content moderation
  (req, res, next) => {
    // Check if content was flagged for review
    if (req.contentModeration && req.contentModeration.action === 'block') {
      return res.status(400).json({
        message: 'Content blocked',
        reason: req.contentModeration.riskAssessment.factors.join(', ')
      });
    }

    // If file was uploaded and passed moderation, process it
    if (req.file) {
      return processContentUpload(req, res);
    }

    // Otherwise, proceed to skill creation
    const { createSkill } = require('../controllers/skills.controller');
    return createSkill(req, res);
  }
);
router.delete('/:id', authMiddleware, deleteSkill);

module.exports = router;