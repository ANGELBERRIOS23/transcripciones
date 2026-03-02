import express from 'express';
import { requirePassword } from '../middleware/auth.js';
import { generateDocx } from '../services/docxGenerator.js';

const router = express.Router();

// POST /api/download/docx
router.post('/docx', requirePassword, async (req, res) => {
  const { transcript, title } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'Se requiere el texto de la transcripción.' });
  }

  try {
    const buffer = await generateDocx(transcript, title || 'Transcripción de Audiencia Legal');
    const filename = `transcripcion_${Date.now()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[/api/download/docx] Error:', err.message);
    res.status(500).json({ error: 'Error al generar el archivo DOCX.' });
  }
});

export default router;
