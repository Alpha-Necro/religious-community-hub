const QuranProgress = require('../models/QuranProgress');

const getQuranProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const progress = await QuranProgress.findOne({ where: { userId } });
    
    if (!progress) {
      return res.status(404).json({ error: 'No progress found' });
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateQuranProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { progress, currentSurah, currentAyah } = req.body;

    const existingProgress = await QuranProgress.findOne({ where: { userId } });

    if (!existingProgress) {
      await QuranProgress.create({
        userId,
        progress,
        currentSurah,
        currentAyah,
        lastReadDate: new Date(),
      });
    } else {
      await existingProgress.update({
        progress,
        currentSurah,
        currentAyah,
        lastReadDate: new Date(),
      });
    }

    res.json({ message: 'Progress updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const setQuranReadingGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetDate, readingMethod, readingGoal } = req.body;

    const progress = await QuranProgress.findOne({ where: { userId } });

    if (!progress) {
      return res.status(404).json({ error: 'No progress found' });
    }

    await progress.update({
      targetDate,
      readingMethod,
      readingGoal,
    });

    res.json({ message: 'Reading goal updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getQuranProgress,
  updateQuranProgress,
  setQuranReadingGoal,
};
