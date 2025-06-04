const express = require('express');
const router = express.Router();
const { sendNotification } = require('../controllers/notificationController');

const {jwtMiddleware} = require('../middleware/jwtMiddleware'); 

// Send notifications to selected/all users
router.post('/send',  sendNotification);

module.exports = router;
