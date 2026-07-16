import { useState } from 'react';

export default function ResultsViewer({ result }) {
  const [tab, setTab] = useState('summary');

  if (!result?.results?.length) return null;

  const chapterResult = result.results[0]?.output;
  if (!chapterResult) return null;

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'edits', label: 'Edits / Suggestions' },
    { id: 'flags', label: `Flags (${chapterResult.flags?.length || 0})` },
    { id: 'fixes', label: `Fixes Made (${chapterResult.fixes?.length || 0})` },
    { id: 'continuity', label: 'Continuity Notes' },
  ];

  return (
    <div className="results-viewer">
      <div className="results-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="results-content">
        {tab === 'summary' && (
          <div className="result-section">
            <pre className="prose-output">{chapterResult.summary || 'No summary generated.'}</pre>
          </div>
        )}

        {tab === 'edits' && (
          <div className="result-section">
            {chapterResult.edits_content ? (
              <pre className="prose-output">{chapterResult.edits_content}</pre>
            ) : (
              <p className="muted">No edits generated for this pass.</p>
            )}
          </div>
        )}

        {tab === 'flags' && (
          <div className="result-section">
            {chapterResult.flags?.length > 0 ? (
              <ul className="flag-list">
                {chapterResult.flags.map((flag, i) => (
                  <li key={i} className="flag-item">{flag}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No flags raised.</p>
            )}
          </div>
        )}

        {tab === 'fixes' && (
          <div className="result-section">
            {chapterResult.fixes?.length > 0 ? (
              <ul className="fix-list">
                {chapterResult.fixes.map((fix, i) => (
                  <li key={i} className="fix-item">{fix}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No fixes were made in this pass.</p>
            )}
          </div>
        )}

        {tab === 'continuity' && (
          <div className="result-section">
            <pre className="prose-output">{chapterResult.continuity || 'No continuity notes.'}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
