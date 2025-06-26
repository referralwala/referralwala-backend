const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { jwtMiddleware, isAdmin } = require('../middleware/jwtMiddleware');
router.get('/coins', jwtMiddleware, walletController.getWallet);
router.post('/createwallet' ,jwtMiddleware, walletController.createWallet)
router.get('/transactions', jwtMiddleware, walletController.getTransactionHistory);
router.get('/balance', jwtMiddleware, walletController.getCurrentCoinBalance);

// routes/walletRoutes.js

router.post('/addcoins', jwtMiddleware, async (req, res) => {
  const { amount, description } = req.body;
  try {
    if (!amount) throw new Error('Amount is required');

    const wallet = await walletController.addCoins(
      req.user.userId,                    
      Number(amount),
      description || 'manual'
    );

    res.json({ message: 'Coins added manually', wallet });
  } catch (e) {
    console.error('❌ Error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

//Blocked Coins
router.post('/blockcoins', jwtMiddleware, async (req, res) => {
  const { amount, description, requestId } = req.body;
  try {
    await walletController.blockCoins(
      req.user.userId,  
      Number(amount),
      description || 'manual block',
      requestId
    );
    res.json({ message: 'Coins blocked successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Refund blocked coins
router.post('/refundcoins', jwtMiddleware, async (req, res) => {
  const { amount, description, requestId } = req.body;
  try {
    await walletController.refundBlockedCoins(
      req.user.userId,  
      amount,
      description || 'manual refund',
      requestId
    );
    res.json({ message: 'Coins refunded successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Spend blocked coins (just record spend transaction)
router.post('/spendcoins', jwtMiddleware, async (req, res) => {
  const { amount, description, requestId } = req.body;
  try {
    await walletController.spendBlockedCoins(
      req.user.userId, 
      Number(amount),
      description || 'manual spend',
      requestId
    );
    res.json({ message: 'Coins spent successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


// Reward coins to user
router.post('/rewardcoins', jwtMiddleware, async (req, res) => {
  const { amount, description, requestId, targetUserId } = req.body;
  try {
    const userIdToCredit = targetUserId ||  req.user.userId ;
    await walletController.rewardCoins(
      userIdToCredit,
      Number(amount),
      description || 'manual reward',
      requestId
    );
    res.json({ message: 'Coins rewarded successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


// User withdraw request
router.post('/withdraw', jwtMiddleware, walletController.requestWithdrawal);

// Admin processes request
router.post('/withdraw/process', jwtMiddleware, isAdmin, walletController.processWithdrawal);

router.get('/history', jwtMiddleware,isAdmin, walletController.getWalletHistoryAndWithdrawals);

router.get('/withdrawals', jwtMiddleware,isAdmin, walletController.getAllWithdrawals);
module.exports = router;
