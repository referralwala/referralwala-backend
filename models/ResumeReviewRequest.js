// models/ResumeReviewRequest.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ResumeReviewRequestSchema = new Schema({
  applicant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  referrer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  applicantQuestion: { 
    type: String, 
    default: "" 
  }, // first optional question
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'inprogress', 'completed','expired'], 
    default: 'pending' 
  },
  reviewComments: { 
    type: String, 
    default: "" 
  }, // first review
  applicantFollowUpQuestion: { 
    type: String, 
    default: "" 
  }, // optional second question
  referrerFollowUpAnswer: { 
    type: String, 
    default: "" 
  }, // second review
  followUpCount: { 
    type: Number, 
    default: 0 
  }, // max 2
  ratingByApplicant: { 
    type: Number, 
    min: 1, 
    max: 5 
  }, 
  ratingComment: { 
    type: String, 
    default: "" 
  },
  type: {
    type: String,
    enum: ['general', 'post-based'],
    default: 'general'
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost'
  },
  chatOpenedAt: { type: Date },
  chatClosedBy: {
    applicant: { type: Boolean, default: false },
    referrer: { type: Boolean, default: false }
  },
  chatClosedAt: { type: Date },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: { 
    type: Date 
  }
});

module.exports = mongoose.model('ResumeReviewRequest', ResumeReviewRequestSchema);
