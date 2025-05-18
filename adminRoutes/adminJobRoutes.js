const express = require('express');
const router = express.Router();
const { jwtMiddleware, isAdmin } = require('../middleware/jwtMiddleware');
const {
  getAllJobPostsAdmin,
  deleteJobPostAdmin,
  updateJobPostAdmin,
  createJobPostByAdminForCustomer,
  getJobPostById,
  getJobPostedByUser
} = require('../adminControllers/jobPostAdminController');

// Protect all routes below with admin access
router.use(jwtMiddleware);
router.use(isAdmin);

// Get all job posts
router.get('/jobs', getAllJobPostsAdmin);

// Delete a job post
router.delete('/jobs/:id', deleteJobPostAdmin);

// Update a job post
router.put('/jobs/:id', updateJobPostAdmin);

// get job by id
router.get('/jobdetail/:id', getJobPostById);

//get job posted by user
router.get('/user/:userId', getJobPostedByUser);



// CReate a job on user behalf
router.post('/create-job', createJobPostByAdminForCustomer);

module.exports = router;
