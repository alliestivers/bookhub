import { useState, useEffect } from 'react';
import ManuscriptUpload from './components/ManuscriptUpload';
import ChapterList from './components/ChapterList';
import PassRunner from './components/PassRunner';
import ResultsViewer from './components/ResultsViewer';
import StatusPanel from './components/StatusPanel';
import ReviewGate from './components/ReviewGate';
import ChapterManager from './components/ChapterManager';
import ChapterEditor from './components/ChapterEditor';
import ReferenceManager from './components/ReferenceManager';

export default function App() {
  const [chapters, setChapters] = useState([]);
  const [manifestChapters, setManifestChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [passResults, setPassResults] = useState({});
  const [completedPasses, setCompletedPasses] = useState({});
  const [status, setStatus] = useState(null);
  const [view, setView] = useState('upload');
  const [runningAll, setRunningAll] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState(null);
  const [reviewGate, setReviewGate] = useState(null);
  const [reviewGateStatus, setReviewGateStatus] = useState(null);
  const [pendingApply, setPendingApply] = useState(null);
  const [editorRefreshKey, setEditorRefreshKey] = useState(0);

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

  async function loadManifestChapters() {
    try {
      const res = await fetch('/chapters/1');
      const data = await res.json();
      setManifestChapters(Array.isArray(data) ? data : []);
    } catch (e) {
      setManifestChapters([]);
    }
  }

  async function loadReviewGate() {
    const res = await fetch('/review-gate/1');
    const data = await res.json();
    setReviewGate(data);
    setReviewGateStatus(data.status);
  }

  async function loadChapterResults(chapter) {
    const r = await fetch(`/workspace/chapter-results/1/${chapter.filename}`);
    const d = await r.json();
    if (d.completed_passes?.length > 0) {
      setCompletedPasses(prev => ({ ...prev, [chapter.filename]: d.completed_passes }));
      const lastPass = Math.max(...d.completed_passes);
      const lastResult = d.results_by_pass[lastPass];
      const p0Summary = d.results_by_pass[0]?.results?.[0]?.output?.summary || '';
      if (lastResult?.results?.[0]?.output && !lastResult.results[0].output.summary) {
        lastResult.results[0].output.summary = p0Summary;
      }
      setPassResults(prev => ({ ...prev, [chapter.filename]: lastResult }));
    }
  }

  async function runPassOnAll(passNumber = 0, skipExisting = false) {
    setRunningAll(true);
    setRunAllProgress({ current: 0, total: 0, currentName: 'Starting...' });
    const res = await fetch('/pass/run-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_number: 1, pass_number: passNumber, skip_existing: skipExisting }),
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
    }, 2000);
  }

  function handleGateUpdate(updatedGate) {
    setReviewGate(updatedGate);
    setReviewGateStatus(updatedGate.status);
  }

  function handleApplied() {
    setEditorRefreshKey(k => k + 1);
  }

  useEffect(() => {
    loadStatus();
    loadChapters();
    loadReviewGate();
    loadManifestChapters();
  }, []);

  const pendingFlagCount = reviewGate?.flags?.filter(f => f.decision === 'pending').length || 0;
  const totalFlagCount = reviewGate?.flags?.length || 0;

  // Derive display name for selected chapter from manifest
  const selectedDisplayName = selectedChapter
    ? (manifestChapters.find(m => m.filename === selectedChapter.filename)?.display_name
        || selectedChapter.display_name
        || selectedChapter.filename)
    : '';

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
          <button className={view === 'chapters' ? 'active' : ''} onClick={() => { setView('chapters'); loadManifestChapters(); }}>Chapters</button>
          <button className={view === 'reference' ? 'active' : ''} onClick={() => setView('reference')}>Reference</button>
          <button
            className={view === 'review' ? 'active' : ''}
            onClick={() => setView('review')}
            style={{ position: 'relative' }}
          >
            Review Gate
            {reviewGateStatus !== 'complete' && totalFlagCount > 0 && (
              <span className="gate-badge">{pendingFlagCount}</span>
            )}
          </button>
          <button className={view === 'logs' ? 'active' : ''} onClick={() => setView('logs')}>Logs</button>
        </nav>
      </header>

      <div className="app-body">
        {view === 'upload' && (
          <ManuscriptUpload onUploaded={() => { loadChapters(); loadStatus(); loadManifestChapters(); }} />
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
                    onRunAll={runningAll ? null : runPassOnAll}
                    runningAll={runningAll}
                    runAllProgress={runAllProgress}
                    reviewGateStatus={reviewGateStatus}
                    onResult={(r) => {
                      setPassResults(prev => ({ ...prev, [selectedChapter.filename]: r }));
                      setCompletedPasses(prev => {
                        const existing = prev[selectedChapter.filename] || [];
                        const passNum = r.pass;
                        return { ...prev, [selectedChapter.filename]: [...new Set([...existing, passNum])] };
                      });
                      loadStatus();
                    }}
                  />
                  {passResults[selectedChapter.filename] && (
                    <ResultsViewer
                      result={passResults[selectedChapter.filename]}
                      chapterFilename={selectedChapter.filename}
                      onApplied={handleApplied}
                    />
                  )}
                  <ChapterEditor
                    chapter={selectedChapter.filename}
                    displayName={selectedDisplayName}
                    pendingApply={pendingApply}
                    onApplyConsumed={() => setPendingApply(null)}
                    refreshKey={editorRefreshKey}
                  />
                </>
              ) : (
                <div className="empty-state">
                  <p>Select a chapter from the sidebar to begin.</p>
                </div>
              )}
            </main>
          </div>
        )}

        {view === 'chapters' && (
          <div className="chapter-manager-view">
            <ChapterManager
              chapters={manifestChapters}
              onChaptersChange={loadManifestChapters}
            />
          </div>
        )}

        {view === 'review' && (
          <ReviewGate gate={reviewGate} onUpdate={handleGateUpdate} />
        )}

        {view === 'reference' && (
          <ReferenceManager />
        )}

        {view === 'logs' && (
          <StatusPanel status={status} onRefresh={loadStatus} />
        )}
      </div>
    </div>
  );
}
