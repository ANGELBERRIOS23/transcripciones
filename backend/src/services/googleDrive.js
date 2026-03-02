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
  // EasyPanel / Docker sometimes turns \n inside strings into real newlines,
  // breaking the PEM key. Normalize it back.
  if (creds.private_key && !creds.private_key.includes('\n')) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
  return creds;
}

export async function uploadToDrive({ audioPath, audioName, transcriptText, mimeType }) {
  const credentials = parseCredentials(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
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
