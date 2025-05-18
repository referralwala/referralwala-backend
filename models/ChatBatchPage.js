const mongoose = require('mongoose');

const ChatBatchPageSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Request' },
  page: { type: Number, required: true },
  messages: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

ChatBatchPageSchema.index({ requestId: 1, page: 1 }, { unique: true });

module.exports = mongoose.model('ChatBatchPage', ChatBatchPageSchema);
