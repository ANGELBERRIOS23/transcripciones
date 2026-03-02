import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError('');

    // Validate against backend (probe endpoint)
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${value}` },
      });
      // 400 = missing file but auth passed; 401 = wrong password
      if (res.status === 401) {
        setError('Contraseña incorrecta. Intenta de nuevo.');
      } else {
        onLogin(value);
      }
    } catch {
      // Network error – still accept locally (offline mode)
      onLogin(value);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light font-display text-slate-900">
      {/* Grid background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white [background:radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Header */}
      <header className="flex w-full items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-soft">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">LegalScript Pro</h2>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-8">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-card backdrop-blur-xl">
            {/* Top accent */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>lock</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Acceso Requerido</h1>
              <p className="mt-2 text-sm text-slate-500">
                Ingresa la clave de acceso para continuar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="access-key">
                  Clave de Acceso
                </label>
                <div className="relative group">
                  <input
                    id="access-key"
                    type="password"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="peer block w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none"
                  />
                  <div className="pointer-events-none absolute left-0 top-0 flex h-full w-11 items-center justify-center text-slate-400 transition-colors peer-focus:text-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>vpn_key</span>
                  </div>
                </div>
                {error && (
                  <p className="flex items-center gap-1.5 text-sm text-red-600">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !value.trim()}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Verificando...
                  </>
                ) : (
                  <>
                    <span>Ingresar</span>
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" style={{ fontSize: 18 }}>arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
