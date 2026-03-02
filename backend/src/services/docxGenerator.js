import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
} from 'docx';

/**
 * Parses transcript text (speaker turns separated by blank lines) into
 * an array of { speaker, text } objects.
 */
function parseTranscript(transcriptText) {
  const blocks = transcriptText.split(/\n\n+/);
  return blocks
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const colonIdx = block.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) {
        const speaker = block.slice(0, colonIdx).trim();
        const text = block.slice(colonIdx + 1).trim();
        return { speaker, text };
      }
      return { speaker: null, text: block };
    });
}

const SPEAKER_COLORS = {
  JUEZ: '1e40af',
  DEFAULT: '374151',
  SPEAKER: '6b21a8',
};

function getSpeakerColor(speaker) {
  if (!speaker) return SPEAKER_COLORS.DEFAULT;
  const upper = speaker.toUpperCase();
  if (upper.includes('JUEZ')) return SPEAKER_COLORS.JUEZ;
  return SPEAKER_COLORS.SPEAKER;
}

/**
 * Generates a DOCX buffer from a transcript string.
 * @param {string} transcriptText
 * @param {string} title
 * @returns {Promise<Buffer>}
 */
export async function generateDocx(transcriptText, title = 'Transcripción de Audiencia Legal') {
  const turns = parseTranscript(transcriptText);

  const children = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: `Generado: ${new Date().toLocaleString('es-GT')}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      border: { bottom: { color: 'e2e8f0', style: BorderStyle.SINGLE, size: 6 } },
    }),
  ];

  for (const { speaker, text } of turns) {
    if (speaker) {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 80 },
          children: [
            new TextRun({
              text: speaker + ':',
              bold: true,
              color: getSpeakerColor(speaker),
              size: 22,
            }),
          ],
        })
      );
    }

    const lines = text.split('\n');
    for (const line of lines) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: line,
              size: 22,
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}
