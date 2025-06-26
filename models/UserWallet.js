// models/UserWallet.js
const mongoose = require('mongoose');

const userWalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  coins: { type: Number, default: 0 },
  blockedCoins: { type: Number, default: 0 },
  transactionHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserWalletTransaction' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserWallet', userWalletSchema);
