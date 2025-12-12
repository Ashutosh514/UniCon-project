const User = require('../models/User');
const Question = require('../models/Question');
const LostItem = require('../models/LostItem');

exports.getStats = async (req, res) => {
    try {
        const studentsCount = await User.countDocuments({ role: 'student' });

        // Sum answers across questions
        const questions = await Question.find().select('answers').lean();
        let solutionsShared = 0;
        for (const q of questions) {
            solutionsShared += (q.answers && q.answers.length) ? q.answers.length : 0;
        }

        const itemsFound = await LostItem.countDocuments({ status: 'found' });

        res.json({ studentsCount, solutionsShared, itemsFound });
    } catch (err) {
        console.error('Error in stats.getStats', err);
        res.status(500).json({ message: 'Error getting stats', error: err.message });
    }
};
