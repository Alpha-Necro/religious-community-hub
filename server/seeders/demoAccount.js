const bcrypt = require('bcryptjs');
const { User, QuranProgress, CommunityStats } = require('../models');

const seedDemoAccount = async () => {
  try {
    // Check if demo user exists
    const existingUser = await User.findOne({
      where: { email: 'demo@communityhub.com' }
    });

    if (existingUser) {
      console.log('Demo account already exists');
      return;
    }

    // Create demo user
    const password = 'Demo123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const demoUser = await User.create({
      name: 'Demo User',
      email: 'demo@communityhub.com',
      password: hashedPassword,
      role: 'member',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create initial Quran progress
    await QuranProgress.create({
      userId: demoUser.id,
      progress: 15.2,
      lastReadDate: new Date(),
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      currentSurah: 5,
      currentAyah: 10,
      readingMethod: 'daily',
      readingGoal: 'Complete 1 juz per week',
    });

    // Create initial community stats
    await CommunityStats.create({
      totalMembers: 1250,
      activeMembers: 850,
      totalEvents: 35,
      upcomingEvents: 10,
      totalResources: 150,
      activeDiscussions: 245,
    });

    console.log('Demo account created successfully');
  } catch (error) {
    console.error('Error seeding demo account:', error);
  }
};

module.exports = seedDemoAccount;
