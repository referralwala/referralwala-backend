const JobPost = require('../models/JobPost');
const User = require('../models/User');
const UniqueJob = require('../models/UniqueJob');
const Notification = require('../models/Notification');

// Get all job posts (admin)
exports.getAllJobPostsAdmin = async (req, res) => {
  try {
    const jobPosts = await JobPost.find().populate('user', 'firstName lastName email');
    res.status(200).json(jobPosts);
  } catch (err) {
    console.error('Admin getAllJobPosts error:', err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete a job post (admin)
exports.deleteJobPostAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const jobPost = await JobPost.findByIdAndDelete(id);

    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    res.status(200).json({ message: 'Job post deleted successfully' });
  } catch (err) {
    console.error('Admin deleteJobPost error:', err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update a job post (admin)
exports.updateJobPostAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const jobPost = await JobPost.findByIdAndUpdate(id, updates, { new: true });

    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    res.status(200).json({ message: 'Job post updated', jobPost });
  } catch (err) {
    console.error('Admin updateJobPost error:', err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// get job details by id
exports.getJobPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const jobPost = await JobPost.findById(id);

    if (!jobPost) {
      return res.status(404).json({ message: 'Job post not found' });
    }

    res.status(200).json({ jobPost });
  } catch (err) {
    console.error('getJobPostById error:', err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// get jobs posted by user
exports.getJobPostedByUser = async (req, res) => {
  try {
    const { userId } = req.params; 

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    // Find job posts associated with the given userId
    const jobPosts = await JobPost.find({ user: userId })
      .populate('user', 'firstName lastName email ') 
      .exec();

    if (jobPosts.length === 0) {
      return res.status(404).json({ message: "Start building your dream team-post your first job!" });
    }

    res.status(200).json(jobPosts);
  } catch (err) {
    console.error('Error fetching job posts by user:', err.message);
    res.status(500).send('Server Error');
  }
};

exports.createJobPostByAdminForCustomer = async (req, res) => {
  try {
     const adminId = req.user.userId;
    const { userId, jobRole, jobUniqueId, endDate, companyName, companyLogoUrl, jobDescription, experienceRequired, location, workMode, employmentType, ctc, noOfReferrals, jobLink } = req.body;

    // Check if the admin exists and has userRole 1
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.userRole !== 1) {
      return res.status(403).json({ message: 'Only admins can post jobs on behalf of customers' });
    }



    // Check if the customer user exists
    const customerUser = await User.findById(userId);
    if (!customerUser) {
      return res.status(404).json({ message: 'Customer user not found' });
    }

    // Check for duplicate job by this user and jobUniqueId
    const duplicateJob = await JobPost.findOne({
      user: userId,
      jobUniqueId,
    });
    if (duplicateJob) {
      return res.status(400).json({ message: 'This customer has already posted this job with the same Job ID.' });
    }

    // Create the job post linked to the customer user
    const newJobPost = new JobPost({
      user: userId,
      jobRole,
      companyName,
      companyLogoUrl,
      jobDescription,
      experienceRequired,
      location,
      workMode,
      jobUniqueId,
      endDate,
      employmentType,
      ctc,
      noOfReferrals,
      jobLink,
    });

    await newJobPost.save();

    // Increment the customer's total job count
    customerUser.totalJobCount += 1;
    await customerUser.save();

    // Handle UniqueJob as in your original controller
    const existingUniqueJob = await UniqueJob.findOne({ jobUniqueId, companyName });

    if (!existingUniqueJob) {
      const uniqueJob = new UniqueJob({
        jobUniqueId,
        latestJobPost: newJobPost._id,
        jobRole,
        companyName,
        companyLogoUrl,
        jobDescription,
        experienceRequired,
        location,
        workMode,
        employmentType,
        ctc,
        jobLink,
        endDate,
      });
      await uniqueJob.save();
    } else {
      const isNewer = !existingUniqueJob.endDate || !endDate || new Date(endDate) > existingUniqueJob.endDate;
      if (isNewer) {
        existingUniqueJob.latestJobPost = newJobPost._id;
        existingUniqueJob.jobRole = jobRole;
        existingUniqueJob.companyName = companyName;
        existingUniqueJob.companyLogoUrl = companyLogoUrl;
        existingUniqueJob.jobDescription = jobDescription;
        existingUniqueJob.experienceRequired = experienceRequired;
        existingUniqueJob.location = location;
        existingUniqueJob.workMode = workMode;
        existingUniqueJob.employmentType = employmentType;
        existingUniqueJob.ctc = ctc;
        existingUniqueJob.jobLink = jobLink;
        existingUniqueJob.endDate = endDate;

        await existingUniqueJob.save();
      }
    }

    // Notify followers of the customer user about the new job post
    const populatedUser = await User.findById(userId).populate('followers');
    populatedUser.followers.forEach(follower => {
      const notification = new Notification({
        user: follower._id,
        message: `${customerUser.firstName} has posted a new job: ${jobRole} at ${companyName}`,
        post: newJobPost._id,
      });
      notification.save();
    });

    res.status(201).json(newJobPost);
  } catch (err) {
    console.error('Error creating job post by admin for customer:', err.message);
    res.status(500).send('Server Error');
  }
};
