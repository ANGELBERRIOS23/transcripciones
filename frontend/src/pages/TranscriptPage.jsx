import { useState, useMemo } from 'react';

const SPEAKER_COLORS = [
  'text-blue-700',
  'text-purple-700',
  'text-orange-700',
  'text-emerald-700',
  'text-rose-700',
  'text-cyan-700',
];

function parseTranscript(text) {
  const blocks = text.split(/\n\n+/);
  return blocks
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const colonIdx = block.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) {
        return { speaker: block.slice(0, colonIdx).trim(), text: block.slice(colonIdx + 1).trim() };
      }
      return { speaker: null, text: block };
    });
}

export default function TranscriptPage({ transcript, filename, password, onBack, onLogout }) {
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);

  const turns = useMemo(() => parseTranscript(transcript), [transcript]);

  // Assign deterministic colors to speakers
  const speakerColorMap = useMemo(() => {
    const map = {};
    let idx = 0;
    for (const { speaker } of turns) {
      if (speaker && !(speaker in map)) {
        map[speaker] = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
        idx++;
      }
    }
    return map;
  }, [turns]);

  const filteredTurns = useMemo(() => {
    if (!search.trim()) return turns;
    const q = search.toLowerCase();
    return turns.filter(
      (t) =>
        t.text.toLowerCase().includes(q) || (t.speaker && t.speaker.toLowerCase().includes(q))
    );
  }, [turns, search]);

  const handleDownloadDocx = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/download/docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({
          transcript,
          title: `Transcripción — ${filename || 'Audiencia Legal'}`,
        }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcripcion_${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al generar el DOCX: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const wordCount = useMemo(
    () => transcript.split(/\s+/).filter(Boolean).length,
    [transcript]
  );

  const speakers = Object.keys(speakerColorMap);

  return (
    <div className="bg-background-light font-display text-slate-900 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>gavel</span>
          </div>
          <h2 className="text-base font-bold tracking-tight">LegalScript Pro</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            Nueva transcripción
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 border-b border-slate-200">
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-2">
              Completado
            </div>
            <h1 className="text-slate-900 text-base font-bold leading-snug truncate">{filename || 'Audiencia Legal'}</h1>
          </div>

          {speakers.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Hablantes</p>
              <div className="flex flex-col gap-2">
                {speakers.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm text-slate-700">
                    <div className={`h-2 w-2 rounded-full ${speakerColorMap[s].replace('text-', 'bg-')}`} />
                    <span className="truncate font-medium">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto p-4 border-t border-slate-200">
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-700">{wordCount.toLocaleString()}</span> palabras
            </p>
            <p className="text-xs text-slate-400 mt-1">
              <span className="font-medium text-slate-700">{turns.length}</span> turnos de habla
            </p>
          </div>
        </aside>

        {/* Main transcript area */}
        <main className="flex-1 flex flex-col relative bg-background-light overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Transcripción Legal</h2>
              <p className="text-xs text-slate-400">Solo lectura</p>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 16 }}>search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en transcripción..."
                className="pl-8 pr-4 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none w-64"
              />
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-4xl mx-auto bg-white shadow-sm border border-slate-200 rounded-xl min-h-full">
              <div className="p-10 space-y-7">
                {/* Document header */}
                <div className="text-center mb-10 border-b border-slate-100 pb-8">
                  <p className="font-mono text-sm text-slate-400 mb-2 uppercase tracking-wider">Transcripción de Audiencia Legal</p>
                  <h1 className="font-display text-2xl font-bold text-slate-900 mb-3">{filename || 'Audiencia'}</h1>
                  <p className="text-sm text-slate-400">{new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                {filteredTurns.length === 0 && (
                  <p className="text-center text-slate-400 py-12">No se encontraron resultados para "{search}"</p>
                )}

                {filteredTurns.map((turn, idx) => (
                  <div key={idx} className="flex gap-6 group">
                    <div className="flex-1">
                      {turn.speaker && (
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className={`font-mono text-sm font-bold tracking-wide ${speakerColorMap[turn.speaker] || 'text-slate-700'}`}>
                            {turn.speaker}:
                          </span>
                        </div>
                      )}
                      <p className="text-base leading-relaxed text-slate-800 whitespace-pre-wrap">
                        {search ? highlightText(turn.text, search) : turn.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-24" />
          </div>

          {/* Fixed bottom action bar */}
          <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                Palabras: <span className="font-semibold text-slate-800">{wordCount.toLocaleString()}</span>
              </span>
              <span className="text-sm text-slate-500">
                Turnos: <span className="font-semibold text-slate-800">{turns.length}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDownloadDocx}
                disabled={downloading}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-200 disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                    Descargar .DOCX
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function highlightText(text, query) {
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
    ) : part
  );
}
