const Notification = require('../models/Notification');

const cleanupNotifications = async () => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

    const unreadResult = await Notification.deleteMany({
      read: false,
      createdAt: { $lt: sevenDaysAgo },
    });

    const readResult = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: threeDaysAgo },
    });

    // console.log(`✅ Notification cleanup done. Deleted ${unreadResult.deletedCount} unread and ${readResult.deletedCount} read notifications.`);
  } catch (err) {
    console.error(' Error during notification cleanup:', err.message);
  }
};

module.exports = cleanupNotifications;
