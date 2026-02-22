require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const connectDB = require('./config/db');
const Event = require('./models/Event');
const Message = require('./models/Message');
const Management = require('./models/Management');
const jwt = require('jsonwebtoken');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup for real-time discussion forum
const io = new Server(server, {
  cors: {
    origin: ['https://felicity-assignment.vercel.app', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  },
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Management.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));
    
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.email}`);

  // Join event forum room
  socket.on('joinForum', (eventId) => {
    socket.join(`forum:${eventId}`);
    console.log(`${socket.user.email} joined forum:${eventId}`);
  });

  // Leave event forum room
  socket.on('leaveForum', (eventId) => {
    socket.leave(`forum:${eventId}`);
  });

  // Send message via socket
  socket.on('sendMessage', async (data) => {
    try {
      const { eventId, content, parentMessageId, isAnnouncement } = data;

      if (!content || content.trim().length === 0) return;
      if (content.length > 2000) return;

      const event = await Event.findById(eventId);
      if (!event) return;

      const isOrganizer = event.organizerId?.toString() === socket.user._id.toString() ||
                          event.organizer?.toString() === socket.user._id.toString();

      const message = new Message({
        event: eventId,
        author: socket.user._id,
        content: content.trim(),
        parentMessage: parentMessageId || null,
        isAnnouncement: isOrganizer && isAnnouncement,
      });

      await message.save();
      await message.populate('author', 'firstName lastName email role clubName councilName organizerName participantType');

      // Broadcast to room
      io.to(`forum:${eventId}`).emit('newMessage', message);
    } catch (err) {
      console.error('Socket sendMessage error:', err.message);
    }
  });

  // Handle reactions via socket
  socket.on('toggleReaction', async (data) => {
    try {
      const { eventId, messageId, emoji } = data;
      const allowedEmojis = ['👍', '❤️', '🎉', '😂', '🤔', '👏'];
      if (!allowedEmojis.includes(emoji)) return;

      const message = await Message.findOne({ _id: messageId, event: eventId, isDeleted: false });
      if (!message) return;

      const existingIndex = message.reactions.findIndex(
        r => r.user.toString() === socket.user._id.toString() && r.emoji === emoji
      );
      if (existingIndex > -1) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions.push({ user: socket.user._id, emoji });
      }
      await message.save();

      io.to(`forum:${eventId}`).emit('reactionUpdated', { messageId, reactions: message.reactions });
    } catch (err) {
      console.error('Socket toggleReaction error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.email}`);
  });
});

// Middleware
app.use(cors({
  origin: ['https://felicity-assignment.vercel.app', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files (payment proofs)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/authRoutes');
const participantRoutes = require('./routes/participantRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const eventRoutes = require('./routes/eventRoutes');
const taskRoutes = require('./routes/taskRoutes');
const advancedRoutes = require('./routes/advancedRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/advanced', advancedRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Felicity Event Management API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      participant: '/api/participant',
      organizer: '/api/organizer',
      admin: '/api/admin',
      events: '/api/events'
    }
  });
});

// Error handler (optional but recommended)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on 0.0.0.0:${PORT}`);
  console.log(`Socket.IO enabled for real-time discussion forum`);
  
  // Auto-update event statuses every minute
  setInterval(async () => {
    try {
      await Event.updateEventStatuses();
    } catch (err) {
      console.error('Error updating event statuses:', err.message);
    }
  }, 60 * 1000);
  
  // Run once on startup
  Event.updateEventStatuses().catch(err => 
    console.error('Initial status update error:', err.message)
  );
});
