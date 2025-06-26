const UserWallet = require('../models/UserWallet');
const UserWalletTransaction = require('../models/UserWalletTransaction');
const User = require('../models/User');
const { saveTransaction } = require('../helpers/transactionHelper');

// Get all user wallets with balances
exports.getAllWallets = async (req, res) => {
  try {
    const wallets = await UserWallet.find().populate('userId', 'firstName lastName email');

    const summary = wallets.map(wallet => ({
      userId: wallet.userId._id,
       walletId: wallet._id,
      name: `${wallet.userId.firstName} ${wallet.userId.lastName}`,
      email: wallet.userId.email,
      coins: wallet.coins,
      blockedCoins: wallet.blockedCoins || 0,
    }));

    res.status(200).json({ wallets: summary });
  } catch (err) {
    console.error('❌ Error fetching all wallets:', err.message);
    res.status(500).json({ message: err.message });
  }
};

//get wallet data by user id
exports.getWalletById = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await UserWallet.findOne({ userId }).populate('userId', 'firstName lastName email');

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found for this user.' });
    }

    const summary = {
      userId: wallet.userId._id,
      walletId: wallet._id,
      name: `${wallet.userId.firstName} ${wallet.userId.lastName}`,
      email: wallet.userId.email,
      coins: wallet.coins,
      blockedCoins: wallet.blockedCoins || 0,
    };

    res.status(200).json({ wallet: summary });
  } catch (err) {
    console.error('❌ Error fetching wallet by ID:', err.message);
    res.status(500).json({ message: err.message });
  }
};

//get wallet data by walletid
exports.getWalletByWalletId = async (req, res) => {
  try {
    const { walletId } = req.params;

    const wallet = await UserWallet.findById(walletId).populate('userId', 'firstName lastName email');

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found.' });
    }

    const summary = {
      userId: wallet.userId._id,
      walletId: wallet._id,
      name: `${wallet.userId.firstName} ${wallet.userId.lastName}`,
      email: wallet.userId.email,
      coins: wallet.coins,
      blockedCoins: wallet.blockedCoins || 0,
    };

    res.status(200).json({ wallet: summary });
  } catch (err) {
    console.error('❌ Error fetching wallet by wallet ID:', err.message);
    res.status(500).json({ message: err.message });
  }
};


// Get overall wallet stats
exports.getWalletStats = async (req, res) => {
  try {
    const wallets = await UserWallet.find();

    const totalUsers = wallets.length;
    const totalCoins = wallets.reduce((acc, w) => acc + (w.coins || 0), 0);
    const totalBlockedCoins = wallets.reduce((acc, w) => acc + (w.blockedCoins || 0), 0);

    res.status(200).json({
      totalUsers,
      totalCoins,
      totalBlockedCoins
    });
  } catch (err) {
    console.error('❌ Error fetching wallet stats:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// Get full transaction logs for any user
exports.getUserTransactions = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await UserWallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    const transactions = await UserWalletTransaction.find({ walletId: wallet._id }).sort({ timestamp: -1 });

    res.status(200).json({ transactions });
  } catch (err) {
    console.error('❌ Error fetching user transactions:', err.message);
    res.status(500).json({ message: err.message });
  }
};


exports.processWithdrawal = async (req, res) => {
  const { transactionId, action, reason, description } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Use approve or reject.' });
  }

  const transaction = await UserWalletTransaction.findById(transactionId);
  if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });

  const entry = transaction.history.find(h => h.type === 'withdraw' && h.status === 'pending');
  if (!entry) return res.status(400).json({ message: 'No pending withdrawal found in transaction.' });

  const wallet = await UserWallet.findById(transaction.walletId);
  if (!wallet) return res.status(404).json({ message: 'Wallet not found.' });

  if (action === 'approve') {
    wallet.blockedCoins -= entry.amount;
    await wallet.save();

    entry.status = 'success';
    entry.description = description || `Withdrawal of ${entry.amount} coins approved and paid`;

    transaction.markModified('history');
    await transaction.save();

    return res.status(200).json({ message: 'Withdrawal approved and marked as paid.' });
  }

  if (action === 'reject') {
    wallet.blockedCoins -= entry.amount;
    wallet.coins += entry.amount;
    await wallet.save();

    entry.status = 'failed';
    entry.error = reason || 'Rejected by admin';
    entry.description = description || `Withdrawal of ${entry.amount} coins rejected and refunded`;

    transaction.markModified('history');
    await transaction.save();

    // Optional refund log
    await saveTransaction({
      walletId: wallet._id,
      userId: transaction.userId,
      type: 'refund',
      amount: entry.amount,
      description: 'Refund due to rejected withdrawal',
      balanceAfter: wallet.coins,
      status: 'success',
    });

    return res.status(200).json({ message: 'Withdrawal rejected and coins refunded.' });
  }
};



exports.getWalletHistoryAndWithdrawals = async (req, res) => {
  try {


    // Get all wallet transactions (admin)
    const transactions = await UserWalletTransaction
      .find({})
      .populate('userId', 'firstName lastName email')
      .sort({ 'history.timestamp': -1 });

    // Extract only withdrawals
    const allWithdrawals = [];

    for (const tx of transactions) {
      for (const h of tx.history) {
        if (h.type === 'withdraw') {
          allWithdrawals.push({
            _id: tx._id,
            user: tx.userId,
            amount: h.amount,
            upiId: tx.meta?.upiId || '',
            status: h.status,
            description: h.description,
            error: h.error,
            timestamp: h.timestamp,
          });
        }
      }
    }

    return res.status(200).json({
      history: transactions,
      withdrawals: allWithdrawals,
    });
  } catch (err) {
    console.error('❌ Error in getWalletHistoryAndWithdrawals:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.getAllWithdrawals = async (req, res) => {
  try {
 

    const transactions = await UserWalletTransaction
      .find({})
      .populate('userId', 'firstName lastName email')
      .sort({ 'history.timestamp': -1 });

    const withdrawals = [];

    for (const tx of transactions) {
      for (const h of tx.history) {
        if (h.type === 'withdraw') {
          withdrawals.push({
            transactionId: tx._id,
            user: tx.userId,
            amount: h.amount,
            upiId: tx.meta?.upiId || '',
            status: h.status,
            description: h.description,
            error: h.error,
            timestamp: h.timestamp,
          });
        }
      }
    }

    res.status(200).json({ withdrawals });
  } catch (err) {
    console.error('❌ Error in getAllWithdrawals:', err.message);
    res.status(500).json({ message: err.message });
  }
};

