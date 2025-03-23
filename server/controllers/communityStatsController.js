const CommunityStats = require('../models/CommunityStats');
const { Op } = require('sequelize');

const getCommunityStats = async (req, res) => {
  try {
    const stats = await CommunityStats.findOne({
      order: [['createdAt', 'DESC']],
    });

    if (!stats) {
      return res.status(404).json({ error: 'No community stats found' });
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCommunityStats = async (req, res) => {
  try {
    const {
      totalMembers,
      activeMembers,
      totalEvents,
      upcomingEvents,
      totalResources,
      activeDiscussions,
    } = req.body;

    // Update the latest stats
    const stats = await CommunityStats.findOne({
      order: [['createdAt', 'DESC']],
    });

    if (!stats) {
      await CommunityStats.create({
        totalMembers,
        activeMembers,
        totalEvents,
        upcomingEvents,
        totalResources,
        activeDiscussions,
      });
    } else {
      await stats.update({
        totalMembers,
        activeMembers,
        totalEvents,
        upcomingEvents,
        totalResources,
        activeDiscussions,
        lastUpdated: new Date(),
      });
    }

    res.json({ message: 'Community stats updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMonthlyStats = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const date = new Date();
    date.setMonth(date.getMonth() - parseInt(months));

    const stats = await CommunityStats.findAll({
      where: {
        createdAt: {
          [Op.gte]: date,
        },
      },
      order: [['createdAt', 'DESC']],
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCommunityStats,
  updateCommunityStats,
  getMonthlyStats,
};
