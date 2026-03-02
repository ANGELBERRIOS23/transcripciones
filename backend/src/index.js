import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import transcribeRouter from './routes/transcribe.js';
import downloadRouter from './routes/download.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/transcribe', transcribeRouter);
app.use('/api/download', downloadRouter);

// Serve React frontend (built files)
// __dirname = /app/src  →  ../public = /app/public
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
