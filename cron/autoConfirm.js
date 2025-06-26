const moment = require('moment');
const ApplicantStatus = require('../models/ApplicantStatus');
const JobPost = require('../models/JobPost');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { blockCoins, spendBlockedCoins, refundBlockedCoins, rewardCoins } = require('../controllers/walletController');
const { GENERAL_SPLIT, PLATFORM_USER_ID } = require('../helpers/constants');

const autoConfirmReferrals = async () => {
  try {
    const threeDaysAgo = moment().subtract(3, 'days').toDate();

    const pending = await ApplicantStatus.find({
      status: 'selected',
      autoConfirmed: false,
      updatedAt: { $lte: threeDaysAgo },
      $or: [
        { employer_doc: { $exists: true, $ne: null }, employee_doc: { $exists: false } },
        { employee_doc: { $exists: true, $ne: null }, employer_doc: { $exists: false } }
      ]
    });

    for (const applicant of pending) {
      const jobPost = await JobPost.findById(applicant.jobPostId);

  
      // Spend blocked coins from applicant
    await spendBlockedCoins(applicant.userId, applicant.reviewCost, 'Referral auto-confirmed after timeout', jobPost._id);

const reviewerShare = (applicant.reviewCost * GENERAL_SPLIT.reviewer) / 100;
const platformShare = (applicant.reviewCost * GENERAL_SPLIT.platform) / 100;

      await rewardCoins(jobPost.user, reviewerShare, 'Referral auto-confirmed (reviewer)', jobPost._id);
      await rewardCoins(PLATFORM_USER_ID, platformShare, 'Platform commission (auto-confirmed)', jobPost._id);


      await User.findByIdAndUpdate(applicant.userId, { $inc: { getreferral: 1 } });
      if (jobPost?.user) {
        await User.findByIdAndUpdate(jobPost.user, { $inc: { givereferral: 1 } });
      }

      applicant.autoConfirmed = true;
      applicant.status = 'completed';
      await applicant.save();
    }

    console.log(`Auto-confirmed ${pending.length} applicants.`);
  } catch (err) {
    console.error("Cron error in auto-confirm:", err);
  }
};


const expireUnreviewedApplications = async () => {
  try {
    const fiveDaysAgo = moment().subtract(5, 'days').toDate();

    const expirable = await ApplicantStatus.find({
      status: { $in: ['applied', 'selected'] },
      autoConfirmed: false,
      updatedAt: { $lte: fiveDaysAgo }
    });

    for (const applicant of expirable) {
      const jobPost = await JobPost.findById(applicant.jobPostId);

      // Refund blocked coins
       // ✅ Only refund if reviewCost is valid
  if (applicant.reviewCost && Number(applicant.reviewCost) > 0) {
    try {
      await refundBlockedCoins(
        applicant.userId,
        applicant.reviewCost,
        'Application expired after inactivity',
        jobPost?._id
      );
    } catch (refundError) {
      console.error(`❌ Refund failed for applicant ${applicant.userId}:`, refundError.message);
    }
  } else {
    console.warn(`⚠️ Skipping refund — invalid or missing reviewCost for applicant ${applicant.userId}`);
  }

      // Update status to expired
      applicant.status = 'expired';
      await applicant.save();

      // Create notification
      await Notification.create({
        user: applicant.userId,
        post: jobPost?._id,
        message: `Your application for ${jobPost?.jobRole} at ${jobPost?.companyName} has expired due to inactivity.`,
      });

      // Optionally send email
      const user = await User.findById(applicant.userId);
      if (user?.email) {
        await sendEmailTemplate(
          user.email,
          'Your Application Has Expired',
          'application_expired_template.html',
          {
            applicantName: user.firstName,
            jobRole: jobPost?.jobRole,
            companyName: jobPost?.companyName,
          }
        );
      }
    }

    console.log(`✅ Expired ${expirable.length} inactive applications.`);
  } catch (err) {
    console.error("❌ Cron error while expiring applications:", err);
  }
};


module.exports = {
  autoConfirmReferrals,
  expireUnreviewedApplications
};

