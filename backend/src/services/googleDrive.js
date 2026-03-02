import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';

/**
 * Returns true if Google Drive is configured via env vars.
 */
export function driveEnabled() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID);
}

/**
 * Uploads the audio file and its transcript to Google Drive.
 * @param {object} opts
 * @param {string} opts.audioPath     - Local path to the audio temp file
 * @param {string} opts.audioName     - Original filename (e.g. audiencia.mp3)
 * @param {string} opts.transcriptText - Plain text transcript
 * @param {string} opts.mimeType      - MIME type of the audio
 * @returns {Promise<{audio: object, transcript: object}>}
 */
export async function uploadToDrive({ audioPath, audioName, transcriptText, mimeType }) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  // Upload original audio
  console.log(`[Drive] Subiendo audio: ${audioName}`);
  const audioRes = await drive.files.create({
    requestBody: { name: audioName, parents: [folderId] },
    media: { mimeType, body: fs.createReadStream(audioPath) },
    fields: 'id,name,webViewLink',
  });

  // Upload transcript as .txt
  const baseName = audioName.replace(/\.[^.]+$/, '');
  const txtName = `${baseName}_transcripcion.txt`;
  console.log(`[Drive] Subiendo transcripción: ${txtName}`);
  const txtRes = await drive.files.create({
    requestBody: { name: txtName, parents: [folderId] },
    media: { mimeType: 'text/plain; charset=utf-8', body: Readable.from([transcriptText]) },
    fields: 'id,name,webViewLink',
  });

  console.log(`[Drive] ✅ Audio: ${audioRes.data.webViewLink}`);
  console.log(`[Drive] ✅ Transcripción: ${txtRes.data.webViewLink}`);

  return { audio: audioRes.data, transcript: txtRes.data };
}
