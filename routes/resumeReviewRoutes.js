
const express = require('express');
const router = express.Router();
const {createReviewRequest, getAllRequestsForReferrer,getUserReviewRequestsById, checkChatStatus,getReviewRequest,updateRequestStatus,submitReview,followUpQuestion,followUpReply,rateReferrer} = require('../controllers/resumeReviewController');
const {jwtMiddleware} = require('../middleware/jwtMiddleware'); 

// User creates request
router.post('/request', jwtMiddleware,  createReviewRequest);

//get user review request
router.get('/request/:id', jwtMiddleware,  getReviewRequest);

// Referrer accepts/rejects/in_progress
router.post('/update-status/:id', jwtMiddleware,  updateRequestStatus);

// Referrer submits first review
router.post('/submit-review/:id', jwtMiddleware,  submitReview);

// Applicant sends follow-up
router.post('/follow-up/:id', jwtMiddleware,  followUpQuestion);

// Referrer replies follow-up
router.post('/follow-up-reply/:id', jwtMiddleware,  followUpReply);

// Applicant rates the referrer
router.post('/rate/:id', jwtMiddleware,  rateReferrer);

// Get all review requests by the logged-in user
router.get('/request/user/:userId', jwtMiddleware, getUserReviewRequestsById);

// Get all requests for a specific referrer
router.get('/referrer-requests/:referrerId', jwtMiddleware, getAllRequestsForReferrer);

// CHeck chat status
router.get('/check-chat/:requestId', checkChatStatus);

module.exports = router;
