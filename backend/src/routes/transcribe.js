import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { requirePassword } from '../middleware/auth.js';
import { transcribeAudio } from '../services/gemini.js';
import { driveEnabled, uploadToDrive } from '../services/googleDrive.js';

const router = express.Router();

// ── In-memory job store ────────────────────────────────────────────────────
// { jobId → { status: 'processing'|'done'|'error', message, transcript, filename, drive, error } }
const jobs = new Map();

// Clean up jobs older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 5 * 60 * 1000);

// ── Multer config ──────────────────────────────────────────────────────────
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.originalname.match(/\.(mp3|wav|m4a|mp4)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos de audio (MP3, WAV, M4A).'));
    }
  },
});

// ── POST /api/transcribe ───────────────────────────────────────────────────
// Returns immediately with a jobId; processing happens in background.
router.post('/', requirePassword, upload.single('audio'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo de audio.' });
  }

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeMap = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4' };
  const mimeType = mimeMap[ext] || file.mimetype || 'audio/mpeg';

  jobs.set(jobId, {
    status: 'processing',
    message: 'Subiendo audio a Gemini...',
    createdAt: Date.now(),
  });

  // Start processing in background (no await — returns to client immediately)
  processJob(jobId, file, mimeType).catch(() => {});

  res.json({ jobId });
});

// ── GET /api/transcribe/status/:jobId ─────────────────────────────────────
router.get('/status/:jobId', requirePassword, (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job no encontrado o expirado.' });
  res.json(job);
});

// ── Background processing ──────────────────────────────────────────────────
async function processJob(jobId, file, mimeType) {
  const update = (fields) => jobs.set(jobId, { ...jobs.get(jobId), ...fields });

  try {
    update({ message: 'Procesando audio con Gemini (puede tardar varios minutos)...' });
    const transcript = await transcribeAudio(file.path, mimeType);

    update({ message: 'Transcripción lista.' });

    let drive = null;
    if (driveEnabled()) {
      update({ message: 'Subiendo archivos a Google Drive...' });
      try {
        drive = await uploadToDrive({
          audioPath: file.path,
          audioName: file.originalname,
          transcriptText: transcript,
          mimeType,
        });
      } catch (driveErr) {
        console.error('[Drive] Upload failed (non-fatal):', driveErr.message);
        drive = { error: driveErr.message };
      }
    }

    update({ status: 'done', transcript, filename: file.originalname, drive, message: 'Completado.' });
  } catch (err) {
    console.error(`[Job ${jobId}] Error:`, err.message);
    update({ status: 'error', error: err.message || 'Error al transcribir el audio.' });
  } finally {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  }
}

export default router;
