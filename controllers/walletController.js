// controllers/walletController.js
const UserWallet = require('../models/UserWallet');
const UserWalletTransaction = require('../models/UserWalletTransaction');
const User = require('../models/User');
const { saveTransaction } = require('../helpers/transactionHelper');
exports.createWallet = async (req, res) => {
  try {
    const userId = req.user.userId; 

    const existing = await UserWallet.findOne({ userId });
    if (existing) return res.json(existing);

    const wallet = await UserWallet.create({
      userId,
      coins: 0,
      transactionHistory: []
    });

    res.json(wallet);
  } catch (err) {
    console.error('Error creating wallet:', err);
    res.status(500).json({ message: 'Server error while creating wallet' });
  }
};

exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.userId; 
    let wallet = await UserWallet.findOne({ userId });
    if (!wallet) {
      // Create wallet if missing
      wallet = await UserWallet.create({
        userId,
        coins: 0,
        transactionHistory: []
      });
    }
    res.json(wallet);
  } catch (err) {
    console.error('Error fetching wallet:', err);
    res.status(500).json({ message: 'Server error fetching wallet' });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wallet = await UserWallet.findOne({ userId });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const transactions = await UserWalletTransaction.find({ walletId: wallet._id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await UserWalletTransaction.countDocuments({ walletId: wallet._id });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
};

exports.addCoins = async (userId, amount, description = 'Coin purchase') => {
  try {
    if (!userId) throw new Error('Missing userId');

    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid amount to add');
    }

    let wallet = await UserWallet.findOne({ userId });
    if (!wallet) {
      wallet = await UserWallet.create({ userId, coins: 0, transactionHistory: [] });
    }

    wallet.coins += numericAmount;
    await wallet.save();

    await saveTransaction({
      walletId: wallet._id,
      userId,
      type: 'purchase',
      amount: numericAmount,
      description,
      balanceAfter: wallet.coins,
      status: 'success'
    });

    return wallet;
  } catch (err) {
    console.error('❌ Error in addCoins:', err.message);

    try {
      const wallet = await UserWallet.findOne({ userId });
      if (wallet) {
        await saveTransaction({
          walletId: wallet._id,
          userId,
          type: 'purchase',
          amount: Number(amount),
          description,
          balanceAfter: wallet?.coins,
          status: 'failed',
          error: err.message
        });
      }
    } catch (logErr) {
      console.error('⚠️ Failed to log failed addCoins transaction:', logErr.message);
    }

    throw new Error(err.message);
  }
};



exports.blockCoins = async (userId, amount, description = '', requestId) => {
  try {
    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid amount to block');
    }

    const wallet = await UserWallet.findOne({ userId });
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.coins < numericAmount) throw new Error('Insufficient available coin balance');

    wallet.coins -= numericAmount;
    wallet.blockedCoins += numericAmount;
    await wallet.save();

    await saveTransaction({
      walletId: wallet._id,
      userId,
      type: 'block',
      amount: numericAmount,
      description,
      requestId,
      balanceAfter: wallet.coins,
      status: 'success'
    });

    return wallet;
  } catch (err) {
    console.error('❌ Error in blockCoins:', err.message);

    try {
      const wallet = await UserWallet.findOne({ userId });
      if (wallet) {
        await saveTransaction({
          walletId: wallet._id,
          userId,
          type: 'block',
          amount: Number(amount),
          description,
          requestId,
          balanceAfter: wallet?.coins,
          status: 'failed',
          error: err.message
        });
      }
    } catch (logErr) {
      console.error('⚠️ Failed to log failed blockCoins transaction:', logErr.message);
    }

    throw new Error(err.message);
  }
};


exports.spendBlockedCoins = async (userId, amount, description = '', requestId) => {
  try {
    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid spend amount');
    }

    const wallet = await UserWallet.findOne({ userId });
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.blockedCoins < numericAmount) throw new Error('Insufficient blocked coin balance');

    wallet.blockedCoins -= numericAmount;
    await wallet.save();

    await saveTransaction({
      walletId: wallet._id,
      userId,
      type: 'spend',
      amount: numericAmount,
      description,
      requestId,
      balanceAfter: wallet.coins,
      status: 'success'
    });

    return wallet;
  } catch (err) {
    console.error('❌ Error in spendBlockedCoins:', err.message);

    try {
      const wallet = await UserWallet.findOne({ userId });
      if (wallet) {
        await saveTransaction({
          walletId: wallet._id,
          userId,
          type: 'spend',
          amount: Number(amount),
          description,
          requestId,
          balanceAfter: wallet?.coins,
          status: 'failed',
          error: err.message
        });
      }
    } catch (logErr) {
      console.error('⚠️ Failed to log failed spendBlockedCoins transaction:', logErr.message);
    }

    throw new Error(err.message);
  }
};



exports.refundBlockedCoins = async (userId, amount, description = '', requestId) => {
  try {
    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid refund amount');
    }

    const wallet = await UserWallet.findOne({ userId });
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.blockedCoins < numericAmount) throw new Error('Insufficient blocked coins to refund');

    wallet.blockedCoins -= numericAmount;
    wallet.coins += numericAmount;
    await wallet.save();

    await saveTransaction({
      walletId: wallet._id,
      userId,
      type: 'refund',
      amount: numericAmount,
      description,
      requestId,
      balanceAfter: wallet.coins,
      status: 'success'
    });

    return wallet;
  } catch (err) {
    console.error('❌ Error in refundBlockedCoins:', err.message);

    try {
      const wallet = await UserWallet.findOne({ userId });
      if (wallet) {
        await saveTransaction({
          walletId: wallet._id,
          userId,
          type: 'refund',
          amount: Number(amount),
          description,
          requestId,
          balanceAfter: wallet?.coins,
          status: 'failed',
          error: err.message
        });
      }
    } catch (logErr) {
      console.error('⚠️ Failed to log failed refundBlockedCoins transaction:', logErr.message);
    }

    throw new Error(err.message);
  }
};

// controllers/walletController.js

exports.requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, upiId } = req.body;

    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (numericAmount < 1) {
      return res.status(400).json({ message: 'Minimum 1000 coins required to withdraw.' });
    }

    const wallet = await UserWallet.findOne({ userId });
    if (!wallet || wallet.coins < numericAmount) {
      return res.status(400).json({ message: 'Insufficient coin balance' });
    }

    // Block the coins
    wallet.coins -= numericAmount;
    wallet.blockedCoins += numericAmount;
    await wallet.save();

    // Log transaction with status "pending"
    await saveTransaction({
      walletId: wallet._id,
      userId,
      type: 'withdraw',
      amount: numericAmount,
      description: `Withdrawal request to UPI ${upiId}`,
      balanceAfter: wallet.coins,
      status: 'pending',
      meta: { upiId },
    });

    res.status(200).json({ message: 'Withdrawal request submitted successfully.' });
  } catch (err) {
    console.error('❌ Error in requestWithdrawal:', err.message);
    res.status(500).json({ message: 'Withdrawal failed', error: err.message });
  }
};

exports.processWithdrawal = async (req, res) => {
  const { transactionId, action, reason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Use approve or reject.' });
  }

  const transaction = await UserWalletTransaction.findById(transactionId);
  if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });

  const entry = transaction.history.find(h => h.type === 'withdraw' && h.status === 'pending');
  if (!entry) return res.status(400).json({ message: 'No pending withdrawal found in transaction.' });

  const wallet = await UserWallet.findOne({ _id: transaction.walletId });

  if (action === 'approve') {
    wallet.blockedCoins -= entry.amount;
    await wallet.save();

    entry.status = 'success';
    entry.description = `Withdrawal of ${entry.amount} coins approved and paid`;
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
    entry.description = `Withdrawal of ${entry.amount} coins rejected and refunded`;
    transaction.markModified('history');
    await transaction.save();

    // Optional: log a new refund entry
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


exports.getAllWithdrawals = async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.role === 1; 

    const query = isAdmin ? {} : { userId };

    const transactions = await UserWalletTransaction
      .find(query)
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
    res.status(500).json({ message: 'Failed to fetch withdrawals' });
  }
};

exports.getWalletHistoryAndWithdrawals = async (req, res) => {
  try {
    const isAdmin = req.user.userRole === 1;// depends on how you store roles
    const userId = req.user.userId;

    const query = isAdmin ? {} : { userId };

    // Get all wallet transactions for the user (or all users if admin)
    const transactions = await UserWalletTransaction
      .find(query)
      .populate('userId', 'firstName lastName email') // only for admin view
      .sort({ 'history.timestamp': -1 });

    // Flatten all withdrawal-type transactions
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
    return res.status(500).json({ message: 'Failed to fetch wallet history' });
  }
};

exports.rewardCoins = async (userId, amount, description = '', requestId) => {
  try {
    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid reward amount');
    }

    const wallet = await UserWallet.findOne({ userId });
    if (!wallet) throw new Error('Wallet not found');

    wallet.coins += numericAmount;
    await wallet.save();

    await saveTransaction({
      walletId: wallet._id,
      userId,
      type: 'reward',
      amount: numericAmount,
      description,
      requestId,
      balanceAfter: wallet.coins,
      status: 'success'
    });

    return wallet;
  } catch (err) {
    console.error('❌ Error in rewardCoins:', err.message);

    try {
      const wallet = await UserWallet.findOne({ userId });
      if (wallet) {
        await saveTransaction({
          walletId: wallet._id,
          userId,
          type: 'reward',
          amount: Number(amount),
          description,
          requestId,
          balanceAfter: wallet?.coins,
          status: 'failed',
          error: err.message
        });
      }
    } catch (logErr) {
      console.error('⚠️ Failed to log failed rewardCoins transaction:', logErr.message);
    }

    throw new Error(err.message);
  }
};





//get current coins
exports.getCurrentCoinBalance = async (req, res) => {
  try {
    const wallet = await UserWallet.findOne({ userId: req.user.userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    res.json({ coins: wallet.coins });
  } catch (err) {
    console.error('💥 Error fetching coin balance:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


