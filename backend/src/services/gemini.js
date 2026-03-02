import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

// Build ordered list of models to try: GEMINI_MODEL → GEMINI_MODEL_2 → GEMINI_MODEL_3 → default
const MODELS = [
  process.env.GEMINI_MODEL,
  process.env.GEMINI_MODEL_2,
  process.env.GEMINI_MODEL_3,
]
  .filter(Boolean)
  .concat(['gemini-2.0-flash']); // always available as last resort

// Deduplicate while preserving order
const MODEL_LIST = [...new Set(MODELS)];

console.log(`[AI] Modelos configurados: ${MODEL_LIST.join(' → ')}`);

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

/** Returns true if the error is a retryable capacity/availability issue */
function isRetryable(err) {
  const msg = err?.message || '';
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

/**
 * Transcribes an audio file, trying each model in MODEL_LIST on capacity errors.
 * @param {string} filePath - Absolute path to the temp audio file.
 * @param {string} mimeType - MIME type of the audio.
 * @returns {Promise<string>} Transcript text.
 */
export async function transcribeAudio(filePath, mimeType = 'audio/mpeg') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no está configurado.');

  const ai = new GoogleGenAI({ apiKey });

  // Upload file once — reuse across model attempts
  console.log(`[AI] Subiendo archivo: ${filePath}`);
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });

  const uploadedFile = await ai.files.upload({
    file: blob,
    config: { mimeType, displayName: filePath.split('/').pop() },
  });

  // Wait for ACTIVE state
  console.log(`[AI] Esperando que el archivo quede activo...`);
  let fileStatus = await ai.files.get({ name: uploadedFile.name });
  while (fileStatus.state === 'PROCESSING') {
    await new Promise((r) => setTimeout(r, 3000));
    fileStatus = await ai.files.get({ name: uploadedFile.name });
  }

  if (fileStatus.state === 'FAILED') {
    throw new Error(`El archivo falló al procesarse: ${uploadedFile.name}`);
  }

  let lastError;
  for (const model of MODEL_LIST) {
    console.log(`[AI] Intentando con modelo: ${model}`);
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { fileData: { fileUri: fileStatus.uri, mimeType } },
              { text: PROMPT },
            ],
          },
        ],
        config: { temperature: 0.0, maxOutputTokens: 65536 },
      });

      // Success — clean up and return
      try { await ai.files.delete({ name: uploadedFile.name }); } catch { /* non-critical */ }
      console.log(`[AI] ✅ Transcripción completada con: ${model}`);
      return response.text?.trim() ?? '';
    } catch (err) {
      lastError = err;
      if (isRetryable(err) && MODEL_LIST.indexOf(model) < MODEL_LIST.length - 1) {
        console.warn(`[AI] Modelo ${model} no disponible, probando siguiente...`);
        continue;
      }
      break; // non-retryable error or last model — stop
    }
  }

  // All models failed — clean up and throw
  try { await ai.files.delete({ name: uploadedFile.name }); } catch { /* non-critical */ }
  throw lastError;
}
