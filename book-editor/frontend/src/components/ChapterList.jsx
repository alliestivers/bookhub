export default function ChapterList({ chapters, selected, onSelect }) {
  return (
    <div className="chapter-list">
      <h3>Chapters <span className="count">{chapters.length}</span></h3>
      {chapters.length === 0 && <p className="muted">No chapters yet. Upload manuscript first.</p>}
      {chapters.map(ch => (
        <button
          key={ch.filename}
          className={`chapter-item ${selected?.filename === ch.filename ? 'active' : ''} ${ch.is_kenna ? 'kenna' : ''}`}
          onClick={() => onSelect(ch)}
        >
          <span className="ch-heading">{ch.heading || ch.filename}</span>
          <span className="ch-meta">{ch.word_count} words {ch.is_kenna ? '(LOCKED)' : ''}</span>
        </button>
      ))}
    </div>
  );
}
