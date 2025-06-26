const express = require('express');
const router = express.Router();
const { jwtMiddleware, isAdmin } = require('../middleware/jwtMiddleware');

const adminWalletController = require('../adminControllers/adminWalletController');
router.use(jwtMiddleware);
router.use(isAdmin);

//get all wallets
router.get('/userwallets', adminWalletController.getAllWallets);

//get all wallet stats
router.get('/totaluserwallet-stats', adminWalletController.getWalletStats);

// user transactions
router.get('/userwallet/:userId/transactions', adminWalletController.getUserTransactions);

// get wallet data by user id
router.get('/userwallet/:userId', adminWalletController.getWalletById);

//get wallet data by walletid
router.get('/userwallet/by-id/:walletId', adminWalletController.getWalletByWalletId);

// Process withdrawal (approve/reject)
router.post('/userwithdraw/process', adminWalletController.processWithdrawal);

// Get all withdrawals (admin only)
router.get('/userwithdrawals',  adminWalletController.getAllWithdrawals);

// Get full wallet history and withdrawals (admin only)
router.get('/userhistory', adminWalletController.getWalletHistoryAndWithdrawals);


module.exports = router;
