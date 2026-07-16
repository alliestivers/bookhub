import { useState } from 'react';

const PASS_LABELS = {
  0: 'Pass 0: Ingest',
  1: 'Pass 1: Developmental',
  2: 'Pass 2: Line Edit',
  3: 'Pass 3: Continuity',
  4: 'Pass 4: Copyedit',
};

const PASS_DESCRIPTIONS = {
  0: 'Read only. Generates summary, continuity notes, and flags. No edits.',
  1: 'Structure and pacing analysis. Flags only. No rewrites.',
  2: 'Line-level suggestions. Every change shown as ORIGINAL / SUGGESTED / WHY.',
  3: 'Continuity check against logs, names list, and timeline.',
  4: 'Mechanical fixes: typos, punctuation, spelling. Logged automatically.',
};

export default function PassRunner({ chapter, onResult, onRunAll, runningAll, runAllProgress }) {
  const [passNumber, setPassNumber] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runPass() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/pass/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_number: 1,
          pass_number: passNumber,
          chapter_filename: chapter.filename,
        }),
      });
      if (!res.ok) throw new Error('Pass failed');
      const data = await res.json();
      onResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pass-runner">
      <div className="chapter-title">
        <h2>{chapter.heading || chapter.filename}</h2>
        <span className="word-count">{chapter.word_count} words</span>
        {chapter.is_kenna && <span className="kenna-badge">LOCKED -- Kenna letter</span>}
      </div>

      <div className="pass-selector">
        {Object.entries(PASS_LABELS).map(([num, label]) => (
          <button
            key={num}
            className={`pass-btn ${passNumber === parseInt(num) ? 'active' : ''}`}
            onClick={() => setPassNumber(parseInt(num))}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pass-description">
        <p>{PASS_DESCRIPTIONS[passNumber]}</p>
      </div>

      {error && <p className="error">{error}</p>}

      <button
        className="btn-primary run-btn"
        onClick={runPass}
        disabled={loading}
      >
        {loading ? `Running ${PASS_LABELS[passNumber]}...` : `Run ${PASS_LABELS[passNumber]}`}
      </button>

      {loading && (
        <div className="progress-hint">
          Claude is reading the chapter... this takes 30-90 seconds.
        </div>
      )}

      {passNumber === 0 && onRunAll && !loading && (
        <button
          className="btn-secondary run-btn"
          style={{ marginLeft: '0.75rem' }}
          onClick={onRunAll}
          disabled={runningAll}
        >
          {runningAll ? 'Running All...' : 'Run Pass 0 on All Chapters'}
        </button>
      )}

      {runningAll && runAllProgress && (
        <div className="progress-hint">
          Ingesting {runAllProgress.currentName} ({runAllProgress.current} of {runAllProgress.total})...
        </div>
      )}
    </div>
  );
}
