const PrayerTimes = require('../models/PrayerTimes');
const axios = require('axios');

const getPrayerTimes = async (req, res) => {
  try {
    const { city, country, method } = req.query;
    
    // First try to get from database
    const today = new Date();
    const existingTimes = await PrayerTimes.findOne({
      where: {
        city,
        country,
        method: parseInt(method) || 2,
        date: today,
      },
    });

    if (existingTimes) {
      return res.json(existingTimes);
    }

    // If not in database, fetch from API
    const response = await axios.post('https://api.aladhan.com/v1/timingsByCity', {
      city,
      country,
      method: parseInt(method) || 2,
    });

    const { data } = response.data;
    const timings = data.timings;

    // Save to database
    const prayerTimes = await PrayerTimes.create({
      city,
      country,
      method: parseInt(method) || 2,
      fajr: timings.Fajr,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      date: today,
      latitude: data.meta.latitude,
      longitude: data.meta.longitude,
    });

    res.json(prayerTimes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updatePrayerTimesLocation = async (req, res) => {
  try {
    const { city, country, method } = req.body;
    const userId = req.user.id;

    // Update user's preferred location
    await PrayerTimes.update(
      { city, country, method: parseInt(method) || 2 },
      { where: { userId } }
    );

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPrayerTimes,
  updatePrayerTimesLocation,
};
