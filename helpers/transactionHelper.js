// helpers/transactionHelper.js
const UserWalletTransaction = require('../models/UserWalletTransaction');
const UserWallet = require('../models/UserWallet');

async function saveTransaction({
  walletId,
  userId,
  type,
  amount,
  description = '',
  requestId = null,
  sourceUser = null,
  targetUser = null,
  meta = {},
  balanceAfter = null,
  status = 'success',       // default is 'success'
  error = null              // optional error message
}) {
  let transaction;

  if (requestId) {
    transaction = await UserWalletTransaction.findOne({ userId, requestId });

    if (transaction) {
      transaction.history.push({
        type,
        amount,
        description,
        balanceAfter,
        timestamp: new Date(),
        status,
        error
      });

      transaction.meta = { ...transaction.meta, ...meta };
      await transaction.save();
    }
  }

  if (!transaction) {
    transaction = new UserWalletTransaction({
      walletId,
      userId,
      history: [{
        type,
        amount,
        description,
        balanceAfter,
        timestamp: new Date(),
        status,
        error
      }],
      requestId,
      sourceUser,
      targetUser,
      meta
    });

    await transaction.save();
  }

  // Add transaction ref to wallet, keep last 100 only
  const wallet = await UserWallet.findById(walletId);
  wallet.transactionHistory.push(transaction._id);

  if (wallet.transactionHistory.length > 100) {
    wallet.transactionHistory.splice(0, wallet.transactionHistory.length - 100);
  }

  await wallet.save();

  return transaction;
}

module.exports = { saveTransaction };
