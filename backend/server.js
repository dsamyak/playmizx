require('dotenv').config(); // 👑 load env vars
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Serve frontend HTML from ../frontend
app.use(express.static(path.join(__dirname, '../public')));


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const authRoutes = require('./routes/auth'); // Path to the file you just shared
app.use('/api/auth', authRoutes);

// API routes
const songRoutes = require('./routes/songs');
app.use('/api/songs', songRoutes);

const playlistRoutes = require('./routes/playlists');
app.use('/api/playlists', playlistRoutes);

// Connect to MongoDB and start the server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ Mongo connection failed:', err));
