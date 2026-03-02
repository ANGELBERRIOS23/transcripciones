import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { requirePassword } from '../middleware/auth.js';
import { transcribeAudio } from '../services/gemini.js';

const router = express.Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|mp4)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos de audio (MP3, WAV, M4A).'));
    }
  },
});

// POST /api/transcribe
router.post('/', requirePassword, upload.single('audio'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo de audio.' });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeMap = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4' };
  const mimeType = mimeMap[ext] || file.mimetype || 'audio/mpeg';

  try {
    const transcript = await transcribeAudio(file.path, mimeType);
    res.json({ transcript, filename: file.originalname });
  } catch (err) {
    console.error('[/api/transcribe] Error:', err.message);
    res.status(500).json({ error: err.message || 'Error al transcribir el audio.' });
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  }
});

export default router;
