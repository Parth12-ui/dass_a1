const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Make io accessible to controllers
app.set('io', io);

// Socket.IO setup
const { initSocket } = require('./utils/socket');
initSocket(io);

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --------------- Routes ---------------
const authRoutes = require('./routes/auth.routes');
const participantRoutes = require('./routes/participant.routes');
const organizerRoutes = require('./routes/organizer.routes');
const adminRoutes = require('./routes/admin.routes');
const teamRoutes = require('./routes/team.routes');
const forumRoutes = require('./routes/forum.routes');
const chatRoutes = require('./routes/chat.routes');
const feedbackRoutes = require('./routes/feedback.routes');

app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Fest Platform API is running' });
});

// --------------- Database & Server ---------------
const PORT = process.env.PORT || 3000;

const seedAdmin = require('./utils/seedAdmin');

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedAdmin();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
