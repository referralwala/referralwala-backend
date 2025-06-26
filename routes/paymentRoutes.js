// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { jwtMiddleware} = require('../middleware/jwtMiddleware');

router.post('/razorpay/order', jwtMiddleware, paymentController.createOrder);
router.post('/razorpay/verify', jwtMiddleware, paymentController.verifyPayment);

module.exports = router;
