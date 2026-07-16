import { useState, useEffect } from 'react';
import ManuscriptUpload from './components/ManuscriptUpload';
import ChapterList from './components/ChapterList';
import PassRunner from './components/PassRunner';
import ResultsViewer from './components/ResultsViewer';
import StatusPanel from './components/StatusPanel';

export default function App() {
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [passResults, setPassResults] = useState({});
  const [status, setStatus] = useState(null);
  const [view, setView] = useState('upload');
  const [runningAll, setRunningAll] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState(null);

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

  async function runPass0OnAll(chapterList) {
    setRunningAll(true);
    setRunAllProgress({ current: 0, total: chapterList.length, currentName: '' });
    for (let i = 0; i < chapterList.length; i++) {
      const ch = chapterList[i];
      setRunAllProgress({ current: i + 1, total: chapterList.length, currentName: ch.heading || ch.filename });
      try {
        const res = await fetch('/pass/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ book_number: 1, pass_number: 0, chapter_filename: ch.filename }),
        });
        if (res.ok) {
          const data = await res.json();
          setPassResults(prev => ({ ...prev, [ch.filename]: data }));
        }
      } catch (e) {
        // continue on error
      }
    }
    setRunningAll(false);
    setRunAllProgress(null);
    loadStatus();
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
                    onRunAll={runningAll ? null : () => runPass0OnAll(chapters)}
                    runningAll={runningAll}
                    runAllProgress={runAllProgress}
                    onResult={(r) => {
                      setPassResults(prev => ({ ...prev, [selectedChapter.filename]: r }));
                      loadStatus();
                    }}
                  />
                  {passResults[selectedChapter.filename] && (
                    <ResultsViewer result={passResults[selectedChapter.filename]} />
                  )}
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
