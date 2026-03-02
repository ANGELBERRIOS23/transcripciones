import { useState, useRef, useCallback } from 'react';

const ACCEPTED = '.mp3,.wav,.m4a,.mp4';
const ACCEPTED_MIME = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4', 'audio/x-m4a'];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage({ password, onTranscript, onLogout, showRestore, savedFilename, onRestore, onDismissRestore }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(''); // status message
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(
      (f) => ACCEPTED_MIME.includes(f.type) || f.name.match(/\.(mp3|wav|m4a|mp4)$/i)
    );
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !names.has(f.name))];
    });
    setError('');
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const handleTranscribe = async () => {
    if (!files.length) return;
    setUploading(true);
    setError('');

    // Process each file sequentially, combine transcripts
    const parts = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`Subiendo parte ${i + 1}/${files.length}: ${file.name}...`);

      const formData = new FormData();
      formData.append('audio', file);

      try {
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { Authorization: `Bearer ${password}` },
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Error ${res.status}`);
        }

        const data = await res.json();
        parts.push({ name: file.name, text: data.transcript });
        setProgress(`Parte ${i + 1}/${files.length} completada.`);
      } catch (err) {
        setError(`Error en "${file.name}": ${err.message}`);
        setUploading(false);
        return;
      }
    }

    // Build combined transcript
    let combined = '';
    if (parts.length === 1) {
      combined = parts[0].text;
    } else {
      combined = parts.map((p, idx) => `## Parte ${idx + 1} — ${p.name}\n\n${p.text}`).join('\n\n---\n\n');
    }

    onTranscript(combined, files.length === 1 ? files[0].name : 'Audiencia Legal');
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background-light font-display text-slate-900 overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>gavel</span>
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight tracking-tight">LegalScript Pro</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-600">Sistema Operacional</span>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center py-10 px-6">
        <div className="w-full max-w-4xl flex flex-col gap-8">

          {/* Restore banner */}
          {showRestore && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: 22 }}>history</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Tienes una transcripción guardada</p>
                <p className="text-xs text-amber-600 truncate">{savedFilename || 'Audiencia Legal'}</p>
              </div>
              <button
                onClick={onRestore}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shrink-0"
              >
                Restaurar
              </button>
              <button
                onClick={onDismissRestore}
                className="p-1 rounded-lg hover:bg-amber-100 text-amber-500 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Nueva Transcripción
            </h1>
            <p className="mt-2 text-slate-500 text-lg max-w-2xl">
              Arrastra tus grabaciones de audiencia aquí. El motor de IA las transcribirá con alta fidelidad.
            </p>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`group relative flex flex-col items-center justify-center w-full min-h-[300px] rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 shadow-sm ${
              dragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-slate-300 bg-white hover:border-primary hover:bg-slate-50 hover:shadow-md'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-5 p-8 text-center z-10">
              <div className={`h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform duration-300 ${dragging ? 'scale-110' : 'group-hover:scale-110'}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 40 }}>mic</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                  {dragging ? 'Suelta los archivos aquí' : 'Arrastra y Suelta Archivos de Audio'}
                </h3>
                <p className="text-slate-500">o haz clic para explorar desde tu computadora</p>
              </div>
              <div className="flex gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                {['MP3', 'WAV', 'M4A'].map((ext) => (
                  <span key={ext} className="px-2 py-1 bg-slate-100 rounded">{ext}</span>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 px-8 py-3 bg-primary hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload_file</span>
                Seleccionar Archivos
              </button>
            </div>
          </div>

          {/* File Queue */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Archivos Seleccionados
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {files.length}
                  </span>
                </h3>
                <button
                  onClick={() => setFiles([])}
                  className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors"
                >
                  Limpiar todo
                </button>
              </div>

              {files.map((file) => (
                <div
                  key={file.name}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className="h-11 w-11 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>graphic_eq</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(file.name)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                  <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 18 }}>error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Progress */}
              {uploading && progress && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-sm">
                  <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>{progress}</span>
                </div>
              )}

              {/* Transcribe button */}
              <button
                onClick={handleTranscribe}
                disabled={uploading}
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Transcribiendo... (puede tardar varios minutos)
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>auto_awesome</span>
                    Transcribir {files.length > 1 ? `${files.length} archivos` : 'audio'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
