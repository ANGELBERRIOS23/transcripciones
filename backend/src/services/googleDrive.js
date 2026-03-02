import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';

export function driveEnabled() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID);
}

/**
 * Parse the service account JSON and fix the private_key if it got mangled
 * by the env var system (literal newlines instead of \n escape sequences).
 */
function parseCredentials(raw) {
  const creds = JSON.parse(raw);
  if (creds.private_key && !creds.private_key.includes('\n')) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
  return creds;
}

function getDrive() {
  const credentials = parseCredentials(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

/**
 * Step 1 — Upload the original audio file to Drive.
 * Call this BEFORE transcription to verify Drive works early.
 */
export async function uploadAudioToDrive({ audioPath, audioName, mimeType }) {
  const drive = getDrive();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  console.log(`[Drive] Subiendo audio: ${audioName}`);
  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: { name: audioName, parents: [folderId] },
    media: { mimeType, body: fs.createReadStream(audioPath) },
    fields: 'id,name,webViewLink',
  });

  console.log(`[Drive] ✅ Audio guardado: ${res.data.webViewLink}`);
  return res.data;
}

/**
 * Step 2 — Upload the transcript .txt to Drive after transcription.
 */
export async function uploadTranscriptToDrive({ transcriptText, audioName }) {
  const drive = getDrive();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const baseName = audioName.replace(/\.[^.]+$/, '');
  const txtName = `${baseName}_transcripcion.txt`;

  console.log(`[Drive] Subiendo transcripción: ${txtName}`);
  const res = await drive.files.create({
    supportsAllDrives: true,
    requestBody: { name: txtName, parents: [folderId] },
    media: { mimeType: 'text/plain; charset=utf-8', body: Readable.from([transcriptText]) },
    fields: 'id,name,webViewLink',
  });

  console.log(`[Drive] ✅ Transcripción guardada: ${res.data.webViewLink}`);
  return res.data;
}
