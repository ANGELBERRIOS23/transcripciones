import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import TranscriptPage from './pages/TranscriptPage.jsx';

const LS_PASSWORD   = 'ltp_password';
const LS_TRANSCRIPT = 'ltp_last_transcript';
const LS_FILENAME   = 'ltp_last_filename';
const LS_DOCX_B64   = 'ltp_last_docx_b64';

export default function App() {
  const [password, setPassword] = useState(() => localStorage.getItem(LS_PASSWORD) || '');
  const [transcript, setTranscript] = useState(null);
  const [filename, setFilename] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [showRestore, setShowRestore] = useState(false);

  // On mount: check if there's a cached transcript from the last session
  useEffect(() => {
    const saved = localStorage.getItem(LS_TRANSCRIPT);
    if (saved && password) setShowRestore(true);
  }, [password]);

  const handleLogin = (pw) => {
    setPassword(pw);
    localStorage.setItem(LS_PASSWORD, pw);
    // Show restore banner if there's a cached transcript
    if (localStorage.getItem(LS_TRANSCRIPT)) setShowRestore(true);
  };

  const handleTranscript = (text, name, file = null) => {
    setTranscript(text);
    setFilename(name);
    setAudioFile(file);
    // New transcript → clear old cached DOCX, save new transcript
    localStorage.removeItem(LS_DOCX_B64);
    localStorage.setItem(LS_TRANSCRIPT, text);
    localStorage.setItem(LS_FILENAME, name);
    setShowRestore(false);
  };

  const handleRestore = () => {
    const saved = localStorage.getItem(LS_TRANSCRIPT);
    const name  = localStorage.getItem(LS_FILENAME) || 'Audiencia guardada';
    if (saved) { setTranscript(saved); setFilename(name); }
    setAudioFile(null); // restored from cache — no audio file available
    setShowRestore(false);
  };

  const handleClearCache = () => {
    localStorage.removeItem(LS_TRANSCRIPT);
    localStorage.removeItem(LS_FILENAME);
    localStorage.removeItem(LS_DOCX_B64);
    setTranscript(null);
    setAudioFile(null);
    setShowRestore(false);
  };

  const handleBack = () => {
    setTranscript(null);
    setAudioFile(null);
    // Keep cache so user can restore
    const saved = localStorage.getItem(LS_TRANSCRIPT);
    if (saved) setShowRestore(true);
  };

  const handleLogout = () => {
    setPassword('');
    setTranscript(null);
    setAudioFile(null);
    setShowRestore(false);
    localStorage.removeItem(LS_PASSWORD);
  };

  if (!password) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (transcript) {
    return (
      <TranscriptPage
        transcript={transcript}
        filename={filename}
        audioFile={audioFile}
        password={password}
        onBack={handleBack}
        onLogout={handleLogout}
        onClearCache={handleClearCache}
      />
    );
  }

  return (
    <UploadPage
      password={password}
      showRestore={showRestore}
      savedFilename={localStorage.getItem(LS_FILENAME)}
      onRestore={handleRestore}
      onDismissRestore={handleClearCache}
      onTranscript={handleTranscript}
      onLogout={handleLogout}
    />
  );
}
