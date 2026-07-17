const PASS_LABELS = { 0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4', 5: 'P5' };

export default function ChapterList({ chapters, selected, onSelect, completedPasses = {} }) {
  return (
    <div className="chapter-list">
      <h3>Chapters <span className="count">{chapters.length}</span></h3>
      {chapters.length === 0 && <p className="muted">No chapters yet. Upload manuscript first.</p>}
      {chapters.map(ch => {
        const passes = completedPasses[ch.filename] || [];
        return (
          <button
            key={ch.filename}
            className={`chapter-item ${selected?.filename === ch.filename ? 'active' : ''} ${ch.is_kenna ? 'kenna' : ''}`}
            onClick={() => onSelect(ch)}
          >
            <span className="ch-heading">{ch.heading || ch.filename}</span>
            <span className="ch-meta">
              {ch.word_count} words {ch.is_kenna ? '(LOCKED)' : ''}
            </span>
            {passes.length > 0 && (
              <span className="ch-passes">
                {passes.map(p => (
                  <span key={p} className="pass-dot">{PASS_LABELS[p]}</span>
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
