// controllers/resumeReviewController.js

const ResumeReviewRequest = require('../models/ResumeReviewRequest');
const User = require('../models/User');
const mongoose = require('mongoose');
const sendEmailTemplate = require('../utils/emailUtils');
const Notification = require('../models/Notification');
const path = require('path');
// 1. Create/get new resume review request

exports.createReviewRequest = async (req, res) => {
  const { applicant, referrer, resumeUrl, applicantQuestion,  type = 'general',  
    postId } = req.body;

  try {
    const newRequest = new ResumeReviewRequest({
      applicant,
      referrer,
      resumeUrl,
      applicantQuestion,
      type,
      post: type === 'post-based' ? postId : undefined,
      status: 'pending', // Initial status when the request is created
      followUpCount: 0,  // Initial follow-up count
    });

    await newRequest.save();
    // Fetch referrer details
    const referrerUser = await User.findById(referrer);

    // Send email notification
    await sendEmailTemplate(
      referrerUser.email,
      'New Resume Review Request',
      'resume_request.html',
      {
        referrerName: referrerUser.firstName || '',
        applicantQuestion,
        requestId: newRequest._id.toString()
      }
    );

    // Send in-app notification
    await Notification.create({
      user: referrer,
      message: 'You have a new resume review request.',
      post: newRequest._id.toString()
    });
    res.status(201).json({ message: 'Review request created successfully', request: newRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const isChatOpen = (request) => {
  if (request.type !== 'post-based' || !request.post?.endDate) return false;

  const bothClosed = request.chatClosedBy?.applicant && request.chatClosedBy?.referrer;
  const now = new Date();
  const endDate = new Date(request.post.endDate);
  const chatExpiry = new Date(endDate.setDate(endDate.getDate() + 2));

  return !bothClosed && now <= chatExpiry;
};

exports.getReviewRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const request = await ResumeReviewRequest.findById(id)
      .populate({
        path: 'applicant',
        select: 'firstName email _id'  // ✅ only name, email, and _id
      })
      .populate({
        path: 'referrer',
        select: 'firstName email _id'  // ✅ also referrer minimal info
      });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

  

// 2. Referrer updates request status (accept/reject/in_progress)


exports.updateRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid review request ID' });
  }

  try {
    const request = await ResumeReviewRequest.findById(id)
    .populate('post')
    .populate('applicant', 'email firstName');
    if (!request) {
      return res.status(404).json({ message: 'Resume review request not found' });
    }

    request.status = status;

    // Handle status change logic
    if (request.type === 'post-based' && status === 'accepted') {
      const chatOpen = isChatOpen(request);

      if (chatOpen) {
        request.chatOpen = true;
        request.chatOpenedAt = new Date(); // Mark the time when chat is opened
      } else {
        request.chatOpen = false; // If the chat can't be opened, ensure that it's set to false
      }
    }

    // If both applicant and referrer have closed the chat, update the status
    if (request.chatClosedBy.applicant && request.chatClosedBy.referrer) {
      request.chatOpen = false;
    }

    await request.save();

    // Notify the applicant about the updated status
    await Notification.create({
      user: request.applicant._id,
      message: `Your resume review status was updated to '${status}'.`,
      post: request._id,
    });
    await sendEmailTemplate(
      request.applicant.email,
      'Resume Review Request Status Updated',
      'resume_status_update.html',
      {
        name: request.applicant.firstName,
        status,
        additionalMessage: `Please log in to check the latest status: <a href="https://www.referralwala.com/" target="_blank">ReferralWala</a>.`,
      },
    );
    
    res.json({ message: `Request status updated to '${status}'`, request });
  } catch (err) {
    console.error('Error updating request status:', err.message);
    res.status(500).json({ message: 'Something went wrong while updating the request status' });
  }
};


// 3. Referrer submits first review

exports.submitReview = async (req, res) => {
  const { id } = req.params;
  const { reviewComments } = req.body;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid review request ID' });
  }

  if (!reviewComments || reviewComments.trim() === '') {
    return res.status(400).json({ message: 'Review comments are required' });
  }

  try {
    const request = await ResumeReviewRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Resume review request not found' });
    }

    // Only allow feedback if the request was accepted
    if (request.status !== 'accepted') {
      return res.status(403).json({ message: 'Review can only be submitted if the request is accepted' });
    }

    request.reviewComments = reviewComments;
    request.status = 'inprogress';
    await request.save();

    res.json({ message: 'Review submitted', request });
  } catch (err) {
    console.error('Error submitting review:', err.message);
    res.status(500).json({ message: 'Something went wrong while submitting the review' });
  }
};


// 4. Applicant asks follow-up
exports.followUpQuestion = async (req, res) => {
  const { id } = req.params;
  const { applicantFollowUpQuestion } = req.body;

  try {
    const request = await ResumeReviewRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.followUpCount >= 1) {
      return res.status(400).json({ message: 'Max follow-ups reached' });
    }

    request.applicantFollowUpQuestion = applicantFollowUpQuestion;
    request.followUpCount += 1;
    await request.save();

    res.json({ message: 'Follow-up question sent', request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 5. Referrer replies to follow-up
exports.followUpReply = async (req, res) => {
  const { id } = req.params;
  const { referrerFollowUpAnswer } = req.body;

  try {
    const request = await ResumeReviewRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.referrerFollowUpAnswer = referrerFollowUpAnswer;
    request.status = 'completed';
    request.completedAt = new Date();
    await request.save();

    res.json({ message: 'Follow-up answer submitted', request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 6. Applicant rates referrer
exports.rateReferrer = async (req, res) => {
  const { id } = req.params;
  const { ratingByApplicant, ratingComment } = req.body;

  try {
    const request = await ResumeReviewRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Prevent duplicate ratings
    if (request.ratingByApplicant) {
      return res.status(400).json({ message: 'Already rated' });
    }

    // Save the rating and comment
    request.ratingByApplicant = ratingByApplicant;
    request.ratingComment = ratingComment;
    await request.save();

    // Update referrer's average rating and count
    const referrer = await User.findById(request.referrer);
    if (referrer) {
      const oldCount = referrer.resumeReviewCount || 0;
      const oldTotal = (referrer.resumeReviewRating || 0) * oldCount;

      const newCount = oldCount + 1;
      const newAvg = (oldTotal + ratingByApplicant) / newCount;

      referrer.resumeReviewRating = newAvg;
      referrer.resumeReviewCount = newCount;
      await referrer.save();
    }

    res.json({ message: 'Rated successfully', request });
  } catch (err) {
    console.error('Error rating referrer:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// 7. Get all review requests by a specific user (by userId param)
exports.getUserReviewRequestsById = async (req, res) => {
  try {
    const { userId } = req.params;  

    const requests = await ResumeReviewRequest.find({ applicant: userId })
      .populate({
        path: 'referrer',
        select: 'firstName email'
      })
      .sort({ createdAt: -1 }); // Latest first

    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 8. Get all review requests for a specific referrer
exports.getAllRequestsForReferrer = async (req, res) => {
  try {
    const { referrerId } = req.params;

    const requests = await ResumeReviewRequest.find({ referrer: referrerId })
      .populate({
        path: 'applicant',
        select: 'firstName email _id' 
      })
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.checkChatStatus = async (req, res) => {
  const { requestId } = req.params;
  const request = await ResumeReviewRequest.findById(requestId).populate('post');

  if (!request) return res.status(404).json({ message: 'Not found' });

  const open = isChatOpen(request);
  return res.json({ chatOpen: open });
};


exports.openChat = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid review request ID' });
  }

  try {
    const request = await ResumeReviewRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Resume review request not found' });
    }

    if (request.status === 'accepted' && !request.chatOpen) {
      request.chatOpen = true;
      request.chatOpenedAt = new Date(); // Set the time when chat is opened
      await request.save();

      // Emit the 'chatUpdated' event to notify clients about the chat status change
      io.emit('chatUpdated', { requestId: request._id, chatStatus: true });

      res.json({ message: 'Chat window opened successfully', request });
    } else {
      res.status(400).json({ message: 'Chat cannot be opened.' });
    }
  } catch (err) {
    console.error('Error opening chat:', err.message);
    res.status(500).json({ message: 'Something went wrong while opening the chat' });
  }
};



exports.closeChat = async (req, res) => {
  const { id } = req.params;
  const { userType } = req.body; // 'applicant' or 'referrer'

  if (!['applicant', 'referrer'].includes(userType)) {
    return res.status(400).json({ message: 'Invalid user type. Must be either "applicant" or "referrer".' });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid review request ID' });
  }

  try {
    const request = await ResumeReviewRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Resume review request not found' });
    }

    // Mark the chat as closed by the respective user
    request.chatClosedBy[userType] = true;
    request.chatClosedAt = new Date(); // Set the time when the chat is closed

    // If both applicant and referrer have closed the chat, set chatOpen to false
    if (request.chatClosedBy.applicant && request.chatClosedBy.referrer) {
      request.chatOpen = false;
    }

    await request.save();

    // Emit the 'chatUpdated' event to notify clients about the chat status change
    io.emit('chatUpdated', { requestId: request._id, chatStatus: request.chatOpen });

    res.json({ message: `Chat closed by ${userType}.`, request });
  } catch (err) {
    console.error('Error closing chat:', err.message);
    res.status(500).json({ message: 'Something went wrong while closing the chat' });
  }
};

