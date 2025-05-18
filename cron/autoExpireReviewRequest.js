const cron = require('node-cron');
const mongoose = require('mongoose');
const ResumeReviewRequest = require('../models/ResumeReviewRequest'); 
// Function to check for expired requests and update their status to 'expired'
const updateExpiredReviewRequests = async () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

  try {
    // Find requests older than 3 days that are still in 'pending' status
    const expiredRequests = await ResumeReviewRequest.updateMany(
      { createdAt: { $lt: threeDaysAgo }, status: 'pending' },
      { $set: { status: 'expired' } }
    );

    if (expiredRequests.modifiedCount > 0) {
      console.log(`${expiredRequests.modifiedCount} requests marked as expired`);
    } else {
      console.log('No requests to expire');
    }
  } catch (err) {
    console.error('Error checking expired requests:', err);
  }
};

// Set up cron job to run every hour (adjust the schedule as necessary)

module.exports = updateExpiredReviewRequests