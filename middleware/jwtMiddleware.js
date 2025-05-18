const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const jwtMiddleware = async (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId) || await User.findById(decoded._id);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = { userId: user._id, userRole: user.userRole || 0 };
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.userRole !== 1) {
    return res.status(403).json({ error: 'Access denied: Admins only' });
  }
  next();
};

module.exports = {
  jwtMiddleware,
  isAdmin,
};
