import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro-preview-06-05';

const PROMPT = `Eres un transcriptor legal profesional. Tu tarea es transcribir con total fidelidad la audiencia de derecho grabada en este audio.

REGLAS ESTRICTAS:
1. Transcribe CADA PALABRA tal como se dice, incluyendo muletillas, repeticiones, pausas (como "este...", "pues..."), errores de pronunciación, frases incompletas y todo lo que se escuche.
2. NO parafrasees, NO corrijas, NO omitas nada, NO mejores el lenguaje.
3. NO agregues interpretaciones, análisis ni comentarios.
4. Identifica al hablante al inicio de cada turno usando el formato:  NOMBRE_ROL: texto
   Roles posibles: JUEZ, ABOGADO DIRECTOR (con el apellido si se menciona), ABOGADA DEFENSORA (con apellido), QUERELLANTE/CREYENTE EXCLUSIVO, QUERELLADA/SINDICADA, ASISTENTE.
   Si no puedes identificar quién habla por contexto, usa HABLANTE DESCONOCIDO.
5. Cuando alguien saluda o hay frases de cortesía, transcríbelas también.
6. Si escuchas repetición de frases por error de grabación, transcríbelas igual.
7. Separa cada turno de habla con una línea en blanco.
8. Produce únicamente la transcripción, sin resumen ni explicaciones.`;

/**
 * Transcribes an audio file using Gemini File API.
 * @param {string} filePath - Absolute path to the temp audio file.
 * @param {string} mimeType - MIME type of the audio (e.g. 'audio/mpeg').
 * @returns {Promise<string>} Transcript text.
 */
export async function transcribeAudio(filePath, mimeType = 'audio/mpeg') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no está configurado.');

  const ai = new GoogleGenAI({ apiKey });

  // Upload file to Gemini Files API
  console.log(`[Gemini] Subiendo archivo: ${filePath}`);
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });

  const uploadedFile = await ai.files.upload({
    file: blob,
    config: { mimeType, displayName: filePath.split('/').pop() },
  });

  // Wait for the file to become ACTIVE
  console.log(`[Gemini] Esperando que el archivo quede activo...`);
  let fileStatus = await ai.files.get({ name: uploadedFile.name });
  while (fileStatus.state === 'PROCESSING') {
    await new Promise((r) => setTimeout(r, 3000));
    fileStatus = await ai.files.get({ name: uploadedFile.name });
    console.log(`[Gemini] Estado: ${fileStatus.state}`);
  }

  if (fileStatus.state === 'FAILED') {
    throw new Error(`El archivo falló en Gemini: ${uploadedFile.name}`);
  }

  console.log(`[Gemini] Archivo activo. Enviando a ${MODEL} para transcripción...`);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        parts: [
          { fileData: { fileUri: fileStatus.uri, mimeType } },
          { text: PROMPT },
        ],
      },
    ],
    config: {
      temperature: 0.0,
      maxOutputTokens: 65536,
    },
  });

  // Clean up the uploaded file from Gemini
  try {
    await ai.files.delete({ name: uploadedFile.name });
  } catch {
    // Non-critical
  }

  return response.text?.trim() ?? '';
}
