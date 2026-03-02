import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import TranscriptPage from './pages/TranscriptPage.jsx';

const LS_KEY = 'ltp_password';

export default function App() {
  const [password, setPassword] = useState(() => localStorage.getItem(LS_KEY) || '');
  const [transcript, setTranscript] = useState(null);
  const [filename, setFilename] = useState('');

  useEffect(() => {
    if (password) localStorage.setItem(LS_KEY, password);
    else localStorage.removeItem(LS_KEY);
  }, [password]);

  const handleLogout = () => {
    setPassword('');
    setTranscript(null);
  };

  if (!password) {
    return <LoginPage onLogin={setPassword} />;
  }

  if (transcript) {
    return (
      <TranscriptPage
        transcript={transcript}
        filename={filename}
        password={password}
        onBack={() => setTranscript(null)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <UploadPage
      password={password}
      onTranscript={(text, name) => {
        setTranscript(text);
        setFilename(name);
      }}
      onLogout={handleLogout}
    />
  );
}
