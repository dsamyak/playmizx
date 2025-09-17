const express = require('express');
const router  = express.Router();
const Song    = require('../models/Song');

const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');

// ── Multer storage ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');  // ✅ use root uploads folder
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});

// ── Allow both audio and image types ─────────────────────────────
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const audioTypes = /mp3|wav|ogg/;
    const imageTypes = /jpg|jpeg|png/;
    const extname = path.extname(file.originalname).toLowerCase();

    if (
      (file.fieldname === 'audio' && audioTypes.test(extname)) ||
      (file.fieldname === 'cover' && imageTypes.test(extname))
    ) {
      cb(null, true);
    } else {
      cb('Error: Only valid audio (mp3/wav/ogg) and image (jpg/png) files allowed!');
    }
  }
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

// ── GET /api/songs ───────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const songs = await Song.find().sort({ uploadedAt: -1 });
    res.json({ songs });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/songs ──────────────────────────────────────────────
router.post('/', (req, res) => {
  upload(req, res, async err => {
    if (err) return res.status(400).json({ error: err.toString() });
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    try {
      const { title, artist } = req.body;
      const audioFile = req.files.audio[0];
      const coverFile = req.files.cover ? req.files.cover[0] : null;

      const newSong = new Song({
        title,
        artist,
        url:   `/uploads/${audioFile.filename}`,
        cover: coverFile ? `/uploads/${coverFile.filename}` : '/uploads/default-cover.jpg'
      });

      await newSong.save();
      console.log('✅ Uploaded:', newSong);
      res.status(201).json(newSong);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
});

// DELETE /api/songs/:id
router.delete('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    // Delete files
    const audioPath = path.join(__dirname, '..', 'uploads', path.basename(song.url));
    const coverPath = path.join(__dirname, '..', 'uploads', path.basename(song.cover));
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    if (fs.existsSync(coverPath) && song.cover !== '/uploads/default-cover.jpg') fs.unlinkSync(coverPath);

    await song.deleteOne();
    res.status(200).json({ message: 'Song deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;
