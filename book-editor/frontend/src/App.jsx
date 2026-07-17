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
  const [completedPasses, setCompletedPasses] = useState({});
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
    const chapterList = data.chapters || [];
    setChapters(chapterList);
    if (chapterList.length > 0) setView('editor');
  }

  async function loadChapterResults(chapter) {
    const r = await fetch(`/workspace/chapter-results/1/${chapter.filename}`);
    const d = await r.json();
    if (d.completed_passes?.length > 0) {
      setCompletedPasses(prev => ({ ...prev, [chapter.filename]: d.completed_passes }));
      const lastPass = Math.max(...d.completed_passes);
      setPassResults(prev => ({ ...prev, [chapter.filename]: d.results_by_pass[lastPass] }));
    }
  }

  async function runPass0OnAll() {
    setRunningAll(true);
    setRunAllProgress({ current: 0, total: 0, currentName: 'Starting...' });
    const res = await fetch('/pass/run-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_number: 1, pass_number: 0 }),
    });
    if (!res.ok) { setRunningAll(false); return; }
    const { job_id, total } = await res.json();
    setRunAllProgress({ current: 0, total, currentName: 'Starting...' });
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/pass/run-all/progress/${job_id}`);
        const p = await r.json();
        setRunAllProgress({ current: p.current, total: p.total, currentName: p.current_name });
        if (p.done) {
          clearInterval(poll);
          setRunningAll(false);
          setRunAllProgress(null);
          loadStatus();
        }
      } catch (e) { /* keep polling */ }
    }, 5000);
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
                completedPasses={completedPasses}
                onSelect={(ch) => { setSelectedChapter(ch); loadChapterResults(ch); }}
              />
            </aside>
            <main className="editor-main">
              {selectedChapter ? (
                <>
                  <PassRunner
                    chapter={selectedChapter}
                    onRunAll={runningAll ? null : runPass0OnAll}
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
