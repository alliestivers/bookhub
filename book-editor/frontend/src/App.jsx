import { useState, useEffect } from 'react';
import ManuscriptUpload from './components/ManuscriptUpload';
import ChapterList from './components/ChapterList';
import PassRunner from './components/PassRunner';
import ResultsViewer from './components/ResultsViewer';
import StatusPanel from './components/StatusPanel';

export default function App() {
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [passResult, setPassResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [view, setView] = useState('upload');

  async function loadStatus() {
    const res = await fetch('/workspace/status/1');
    const data = await res.json();
    setStatus(data);
  }

  async function loadChapters() {
    const res = await fetch('/manuscript/chapters/1');
    const data = await res.json();
    setChapters(data.chapters || []);
    if (data.chapters?.length > 0) setView('editor');
  }

  useEffect(() => {
    loadStatus();
    loadChapters();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Choose Me</h1>
          <span className="subtitle">Editorial Agent</span>
        </div>
        <nav>
          <button className={view === 'upload' ? 'active' : ''} onClick={() => setView('upload')}>Upload</button>
          <button className={view === 'editor' ? 'active' : ''} onClick={() => setView('editor')}>Editor</button>
          <button className={view === 'logs' ? 'active' : ''} onClick={() => setView('logs')}>Logs</button>
        </nav>
      </header>

      <div className="app-body">
        {view === 'upload' && (
          <ManuscriptUpload onUploaded={() => { loadChapters(); loadStatus(); }} />
        )}

        {view === 'editor' && (
          <div className="editor-layout">
            <aside className="chapter-sidebar">
              <ChapterList
                chapters={chapters}
                selected={selectedChapter}
                onSelect={setSelectedChapter}
              />
            </aside>
            <main className="editor-main">
              {selectedChapter ? (
                <>
                  <PassRunner
                    chapter={selectedChapter}
                    onResult={(r) => { setPassResult(r); loadStatus(); }}
                  />
                  {passResult && <ResultsViewer result={passResult} />}
                </>
              ) : (
                <div className="empty-state">
                  <p>Select a chapter from the sidebar to begin.</p>
                </div>
              )}
            </main>
          </div>
        )}

        {view === 'logs' && (
          <StatusPanel status={status} onRefresh={loadStatus} />
        )}
      </div>
    </div>
  );
}
