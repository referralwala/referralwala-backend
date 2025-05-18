const express = require('express');
const router = express.Router();
const { getChatMessages } = require('../controllers/ChatMessagesController'); 
const {jwtMiddleware} = require('../middleware/jwtMiddleware'); 

// Route to fetch chat messages with pagination
router.get('/messages/:requestId', getChatMessages);


module.exports = router;
