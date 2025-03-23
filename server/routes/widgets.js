const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getPrayerTimes,
  updatePrayerTimesLocation,
} = require('../controllers/prayerTimesController');
const {
  getQuranProgress,
  updateQuranProgress,
  setQuranReadingGoal,
} = require('../controllers/quranProgressController');
const {
  getCommunityStats,
  updateCommunityStats,
  getMonthlyStats,
} = require('../controllers/communityStatsController');

// Prayer Times routes
router.get('/prayer-times', getPrayerTimes);
router.put('/prayer-times/location', auth, updatePrayerTimesLocation);

// Quran Progress routes
router.get('/quran-progress', auth, getQuranProgress);
router.put('/quran-progress', auth, updateQuranProgress);
router.put('/quran-progress/goal', auth, setQuranReadingGoal);

// Community Stats routes
router.get('/community-stats', getCommunityStats);
router.put('/community-stats', auth, updateCommunityStats);
router.get('/community-stats/monthly', getMonthlyStats);

module.exports = router;
