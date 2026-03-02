import { useState, useMemo, useEffect, useRef } from 'react';

const LS_DOCX_B64 = 'ltp_last_docx_b64';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const colonIdx = block.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) {
        return { speaker: block.slice(0, colonIdx).trim(), text: block.slice(colonIdx + 1).trim() };
      }
      return { speaker: null, text: block };
    });
}

function b64ToBlob(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: DOCX_MIME });
}

function blobToB64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function TranscriptPage({ transcript, filename, audioFile, password, onBack, onLogout, onClearCache }) {
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [docxUrl, setDocxUrl] = useState(null);
  const [docxCached, setDocxCached] = useState(false);
  const blobUrlRef = useRef(null);

  // Audio player state
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  // Restore DOCX from localStorage on mount
  useEffect(() => {
    const b64 = localStorage.getItem(LS_DOCX_B64);
    if (b64) {
      try {
        const blob = b64ToBlob(b64);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setDocxUrl(url);
        setDocxCached(true);
      } catch {
        localStorage.removeItem(LS_DOCX_B64);
      }
    }
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, []);

  // Create object URL for the audio file
  useEffect(() => {
    if (!audioFile) return;
    const url = URL.createObjectURL(audioFile);
    audioUrlRef.current = url;
    setAudioUrl(url);
    return () => { URL.revokeObjectURL(url); audioUrlRef.current = null; };
  }, [audioFile]);

  // Audio controls
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };
  const handleSeek = (e) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const handleDownloadDocx = async () => {
    const safeFilename = `transcripcion_${(filename || 'audiencia').replace(/\.[^.]+$/, '')}.docx`;
    if (docxUrl) {
      const a = document.createElement('a');
      a.href = docxUrl; a.download = safeFilename; a.click();
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch('/api/download/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ transcript, title: `Transcripción — ${filename || 'Audiencia Legal'}` }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      try {
        const b64 = await blobToB64(blob);
        localStorage.setItem(LS_DOCX_B64, b64);
        setDocxCached(true);
      } catch { /* storage full, non-fatal */ }
      const url = URL.createObjectURL(blob);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setDocxUrl(url);
      const a = document.createElement('a');
      a.href = url; a.download = safeFilename; a.click();
    } catch (err) {
      alert('Error al generar el DOCX: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const turns = useMemo(() => parseTranscript(transcript), [transcript]);

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
      (t) => t.text.toLowerCase().includes(q) || (t.speaker && t.speaker.toLowerCase().includes(q))
    );
  }, [turns, search]);

  const wordCount = useMemo(() => transcript.split(/\s+/).filter(Boolean).length, [transcript]);
  const speakers = Object.keys(speakerColorMap);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 flex-col shrink-0 overflow-y-auto hidden sm:flex">
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

          <div className="mt-auto p-4 border-t border-slate-200 space-y-2">
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-700">{wordCount.toLocaleString()}</span> palabras
            </p>
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-700">{turns.length}</span> turnos de habla
            </p>
            <button
              onClick={onClearCache}
              className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
              title="Borrar transcripción y DOCX guardados"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
              Borrar caché
            </button>
          </div>
        </aside>

        {/* Main transcript area */}
        <main className="flex-1 flex flex-col relative bg-background-light overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Transcripción Legal</h2>
              <p className="text-xs text-slate-400">Solo lectura</p>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 16 }}>search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-8 pr-4 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none w-36 sm:w-64"
              />
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-8 py-6 sm:py-8">
            <div className="max-w-4xl mx-auto bg-white shadow-sm border border-slate-200 rounded-xl min-h-full">
              <div className="p-5 sm:p-10 space-y-7">
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
            <div className="h-32" />
          </div>

          {/* Fixed bottom bar */}
          <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">

            {/* Audio player — only when audio is available */}
            {audioUrl && (
              <div className="px-4 sm:px-6 pt-3 pb-1 flex items-center gap-3">
                {/* Hidden audio element */}
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                  onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
                  onEnded={() => setPlaying(false)}
                />

                {/* Play / Pause */}
                <button
                  onClick={togglePlay}
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-blue-700 active:scale-95 transition-all shrink-0 shadow-sm shadow-blue-300"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {playing ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                {/* Time */}
                <span className="text-xs font-mono text-slate-500 shrink-0 tabular-nums">
                  {formatTime(currentTime)}
                  <span className="text-slate-300 mx-1">/</span>
                  {formatTime(duration)}
                </span>

                {/* Progress bar */}
                <div className="relative flex-1 h-2 group/bar cursor-pointer" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const t = ((e.clientX - rect.left) / rect.width) * (duration || 0);
                  setCurrentTime(t);
                  if (audioRef.current) audioRef.current.currentTime = t;
                }}>
                  {/* Track */}
                  <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-slate-200 my-auto h-1.5" />
                  {/* Fill */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary my-auto h-1.5 transition-none"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-primary shadow border-2 border-white opacity-0 group-hover/bar:opacity-100 transition-opacity"
                    style={{ left: `${progress}%` }}
                  />
                  {/* Invisible range for keyboard + fine scrubbing */}
                  <input
                    type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                  />
                </div>
              </div>
            )}

            {/* Actions row */}
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-xs sm:text-sm text-slate-500">
                  <span className="font-semibold text-slate-800">{wordCount.toLocaleString()}</span> palabras
                </span>
                <span className="text-xs sm:text-sm text-slate-500 hidden sm:inline">
                  <span className="font-semibold text-slate-800">{turns.length}</span> turnos
                </span>
                <button
                  onClick={onClearCache}
                  className="sm:hidden flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                  Caché
                </button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={onBack}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleDownloadDocx}
                  disabled={downloading}
                  className="px-3 sm:px-5 py-2 rounded-lg bg-primary text-white text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm shadow-blue-200 disabled:opacity-50"
                >
                  {downloading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span className="hidden sm:inline">Generando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 17 }}>download</span>
                      <span>.DOCX</span>
                      {docxCached && (
                        <span className="hidden sm:inline ml-0.5 px-1.5 py-0.5 rounded bg-white/20 text-xs font-medium">
                          guardado
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
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
