// backend/routes/playlists.js
const express  = require('express');
const router   = express.Router();
const Playlist = require('../models/Playlist');     // your Mongoose model
const Song     = require('../models/Song');         // needed for populate checks

/* ========== GET all playlists ========== */
router.get('/', async (_req, res) => {
  try {
    const playlists = await Playlist.find().select('-__v');
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ========== GET one playlist (with songs) ========== */
router.get('/:id', async (req, res) => {
  try {
    const pl = await Playlist.findById(req.params.id).populate('songs');
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });
    res.json(pl);
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID' });
  }
});

/* ========== CREATE playlist ========== */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const newPl = await Playlist.create({ name, songs: [] });
    res.status(201).json(newPl);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ========== RENAME playlist ========== */
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const pl = await Playlist.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });
    res.json(pl);
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID' });
  }
});

/* ========== DELETE playlist ========== */
router.delete('/:id', async (req, res) => {
  try {
    const pl = await Playlist.findByIdAndDelete(req.params.id);
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID' });
  }
});

/* ========== ADD song to playlist ========== */
router.post('/:id/add', async (req, res) => {
  try {
    const { songId } = req.body;
    const pl = await Playlist.findById(req.params.id);
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });

    // ensure song exists
    const songExists = await Song.exists({ _id: songId });
    if (!songExists) return res.status(404).json({ error: 'Song not found' });

    if (!pl.songs.includes(songId)) pl.songs.push(songId);
    await pl.save();
    res.json(pl);
  } catch (err) {
    res.status(400).json({ error: 'Invalid data' });
  }
});

/* ========== REMOVE song from playlist ========== */
router.delete('/:id/songs/:songId', async (req, res) => {
  try {
    const { id, songId } = req.params;
    const pl = await Playlist.findById(id);
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });

    pl.songs = pl.songs.filter(s => s.toString() !== songId);
    await pl.save();
    res.json(pl);
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID' });
  }
});

// Create playlist
router.post('/', async (req, res) => {
  const { name } = req.body;
  const playlist = new Playlist({ name, songs: [] });
  await playlist.save();
  res.json(playlist);
});

// Get all playlists
router.get('/', async (_req, res) => {
  const playlists = await Playlist.find();
  res.json(playlists);
});

// Get playlist by ID
router.get('/:id', async (req, res) => {
  const playlist = await Playlist.findById(req.params.id).populate('songs');
  res.json(playlist);
});

// Rename playlist
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  const playlist = await Playlist.findByIdAndUpdate(req.params.id, { name }, { new: true });
  res.json(playlist);
});

// Delete playlist
router.delete('/:id', async (req, res) => {
  await Playlist.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Add song to playlist
router.post('/:id/add', async (req, res) => {
  const playlist = await Playlist.findById(req.params.id);
  if (!playlist.songs.includes(req.body.songId)) {
    playlist.songs.push(req.body.songId);
    await playlist.save();
  }
  res.json(playlist);
});

// Remove song from playlist
router.post('/:id/remove', async (req, res) => {
  const playlist = await Playlist.findById(req.params.id);
  playlist.songs = playlist.songs.filter(id => id.toString() !== req.body.songId);
  await playlist.save();
  res.json(playlist);
});

module.exports = router;
