const { saveChatMessage } = require('../controllers/ChatMessagesController');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('🟢 User connected:', socket.id);

    socket.on('joinRequestRoom', (requestId) => {
      socket.join(requestId);
      console.log(`User joined room: ${requestId}`);
    });

    socket.on('sendMessage', async ({ requestId, senderId, message }) => {
      const payload = { requestId, senderId, message, timestamp: new Date() };

      try {
        await saveChatMessage(requestId, senderId, message);
        console.log("Chat message saved");

        io.to(requestId).emit('receiveMessage', payload);
      } catch (err) {
        console.error('Error saving chat message:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔴 User disconnected:', socket.id);
    });
  });
};

module.exports = socketHandler;
