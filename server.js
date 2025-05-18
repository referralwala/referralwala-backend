const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const socketHandler = require('./socket/chatHandler');
const cors = require('cors');
const passport = require('passport');
const cron = require('node-cron');
const connectDB = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const jobPostRoutes = require('./routes/jobPostRoutes');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contactRoutes');
const Notification = require('./models/Notification');
const jobReportRoutes = require('./routes/jobReport');
const locationRoutes = require('./routes/locationRoutes');
const rapidJobRoutes = require('./routes/rapidJobRoutes');
const rapidInternshipRoutes = require('./routes/rapidInternshipRoutes');
const autoConfirmReferrals = require('./cron/autoConfirm');
const refreshRapidJobs = require('./cron/refreshRapidJobs');
const refreshRapidInternships = require('./cron/refreshRapidInternships')
const resumeReviewRoutes = require('./routes/resumeReviewRoutes');
const chatMessagesRoutes = require('./routes/chatMessagesRoutes');
const updateExpiredReviewRequests = require('./cron/autoExpireReviewRequest');

// Admin Routes
const userDataRoutes = require('./adminRoutes/userDataRoutes')
const adminJobRoutes = require('./adminRoutes/adminJobRoutes');
const adminAuthRoutes = require('./adminRoutes/adminAuthRoutes');


dotenv.config();
require('./config/passport');


const app = express();
const server = http.createServer(app);
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:5500', 'https://www.referralwala.com', 'https://referralwala.com','http://3.109.97.10' ]
}));
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000',  'http://localhost:3001', 'http://127.0.0.1:5500', 'https://www.referralwala.com', 'https://referralwala.com','http://3.109.97.10']
  }
});
socketHandler(io);
io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);
});

app.use(express.json({ limit: '10mb' }));

connectDB();

app.use(express.json());

app.use(passport.initialize());

  // Runs daily at midnight to auto-confirm applicants
cron.schedule('0 0 * * *', async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ createdAt: { $lt: sevenDaysAgo } });
    console.log('Old notifications deleted successfully.');
  } catch (err) {
    console.error('Error deleting old notifications:', err.message);
  }
});

// Auto-confirm referrals after 3 days if only one side uploaded a document
cron.schedule('0 0 * * *', autoConfirmReferrals);
// 🕑 Run every 5 days at 2 AM
cron.schedule('0 2 */5 * *', refreshRapidJobs);
// 🕓 Run every 5 days at 3 AM
cron.schedule('0 3 */5 * *', refreshRapidInternships);

//Runs everyday at midnight
cron.schedule('0 0 * * *', updateExpiredReviewRequests);

app.get('/', (req, res) => {
    res.send('Server Running Successfully');
});
app.use('/user', userRoutes);
app.use('/job', jobPostRoutes);
app.use('/contact', contactRoutes);
app.use('/googleauth',authRoutes);
app.use('/job-reports', jobReportRoutes);
app.use('/locationlist',locationRoutes)
app.use('/rapidjob', rapidJobRoutes);
app.use('/rapidinternship',rapidInternshipRoutes);
app.use('/review', resumeReviewRoutes);
app.use('/chat',chatMessagesRoutes);

//Admin 
app.use('/adminuser', userDataRoutes);
app.use('/adminjob', adminJobRoutes);
app.use('/adminauth', adminAuthRoutes);


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
