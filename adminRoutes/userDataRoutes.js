const express = require('express');
const router = express.Router();
const { jwtMiddleware, isAdmin } = require('../middleware/jwtMiddleware');
const {getAllUsers,deleteUser,updateUserRole} = require('../adminControllers/userDataController')

// Apply jwtMiddleware and isAdmin to protect all routes below
router.use(jwtMiddleware);
router.use(isAdmin);

// Get all users
router.get('/users', getAllUsers);

// Delete a user
router.delete('/users/:id', deleteUser);

// Update user role
router.put('/users/:id/userRole', updateUserRole);

module.exports = router;
