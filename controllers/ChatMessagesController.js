const ChatBatchPage = require('../models/ChatBatchPage');

exports.saveChatMessage = async (requestId, senderId, message) => {
  try {
    // Find the latest batch for this requestId
    let latestBatch = await ChatBatchPage
      .findOne({ requestId })
      .sort({ page: -1 });

    if (!latestBatch || latestBatch.messages.length >= 100) {
      // Create a new page (increment from latest, or start at 1)
      const nextPage = latestBatch ? latestBatch.page + 1 : 1;

      latestBatch = new ChatBatchPage({
        requestId,
        page: nextPage,
        messages: [{ senderId, message }]
      });
    } else {
      latestBatch.messages.push({ senderId, message });
    }

    await latestBatch.save();
    console.log('Message saved in page', latestBatch.page);
  } catch (err) {
    console.error('Error saving chat message:', err);
  }
};

exports.getChatMessages = async (req, res) => {
  const { requestId } = req.params;
  const page = parseInt(req.query.page) || 1;

  try {
    const batch = await ChatBatchPage.findOne({ requestId, page });

    if (!batch) {
      return res.status(200).json({ messages: [], page });
    }

    res.status(200).json({
      messages: batch.messages,
      page,
      hasMore: batch.messages.length === 100
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
