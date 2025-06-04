const JobPost = require('../models/JobPost');
const Notification = require('../models/Notification');
const User = require('../models/User');

const runWeeklyJobNotification = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentJobPosts = await JobPost.find({
      createdAt: { $gte: sevenDaysAgo },
      status: 'active',
    }).select('jobRole');

    if (!recentJobPosts.length) {
      console.log('✅ No new job posts this week. Skipping notification.');
      return;
    }

    const jobTitles = recentJobPosts.map(job => job.jobRole);
    const previewJobs = jobTitles.slice(0, 3).join(', ') + (jobTitles.length > 3 ? ', and more' : '');
    const message = `New jobs were posted this week: ${previewJobs}. Go check them out!`;

    const users = await User.find({}, '_id');
    const notifications = users.map(user => ({
      user: user._id,
      message,
    }));

    await Notification.insertMany(notifications);
    console.log(`✅ Weekly job notifications sent to ${users.length} users.`);
  } catch (err) {
    console.error('❌ Error in weekly job notification cron:', err.message);
  }
};

module.exports = runWeeklyJobNotification;
