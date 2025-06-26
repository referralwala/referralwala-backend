const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserWallet', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Full history of changes as array of objects
  history: [{
    type: { type: String, enum: ['purchase', 'spend', 'reward', 'block', 'refund', 'withdraw'], required: true },
    amount: { type: Number, required: true },
    description: String,
    balanceAfter: Number,
    timestamp: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success'
    },
    error: {
      type: String,
      default: null
    }
  }],

  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResumeReviewRequest' },
  // sourceUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  meta: { type: mongoose.Schema.Types.Mixed }
});

module.exports = mongoose.model('UserWalletTransaction', transactionSchema);
