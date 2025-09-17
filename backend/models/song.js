const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  artist:  { type: String, required: true },
  url:     { type: String, required: true }, // points to /uploads/*.mp3
  cover:   { type: String, default: '/uploads/default-cover.jpg' },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', SongSchema);
