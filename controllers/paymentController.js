// controllers/paymentController.js
const crypto = require('crypto');
const UserWallet = require('../models/UserWallet');
const { addCoins } = require('./walletController');
const razorpay = require('../config/razorpay');

exports.createOrder = async (req, res) => {
  try {
    const { amountInINR } = req.body;

    const options = {
      amount: amountInINR * 100, // in paisa
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    res.status(500).json({ error: 'Razorpay order creation failed' });
  }
};


// controllers/paymentController.js

exports.verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amountInINR
  } = req.body;

  const secret = process.env.RAZORPAY_KEY_SECRET;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const generated_signature = hmac.digest('hex');

  if (generated_signature === razorpay_signature) {
    // ✅ Successful payment - credit coins
    const coinsToAdd = amountInINR * 1; // 1 INR = 1 coins

    const description = `Razorpay payment: ${razorpay_payment_id}`;

    await addCoins(req.user.userId, coinsToAdd, description);

    return res.json({ success: true, message: 'Coins added' });
  } else {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
};

