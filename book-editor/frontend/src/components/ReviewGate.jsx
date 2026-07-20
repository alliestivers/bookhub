import { useState } from 'react';

export default function ReviewGate({ gate, onUpdate }) {
  const [expanded, setExpanded] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState('pending');

  if (!gate) return <div className="empty-state"><p>Loading review gate...</p></div>;

  const flags = gate.flags || [];
  const total = flags.length;
  const reviewed = flags.filter(f => f.decision !== 'pending').length;
  const isComplete = gate.status === 'complete';

  const filteredFlags = filter === 'all' ? flags
    : filter === 'pending' ? flags.filter(f => f.decision === 'pending')
    : filter === 'approved' ? flags.filter(f => f.decision === 'approved')
    : flags.filter(f => f.decision === 'rejected');

  const byChapter = filteredFlags.reduce((acc, flag) => {
    if (!acc[flag.chapter]) acc[flag.chapter] = [];
    acc[flag.chapter].push(flag);
    return acc;
  }, {});

  async function buildGate() {
    const res = await fetch('/review-gate/1/build', { method: 'POST' });
    const data = await res.json();
    onUpdate(data);
  }

  async function setDecision(flagId, decision, note) {
    const res = await fetch('/review-gate/1/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag_id: flagId, decision, note }),
    });
    const data = await res.json();
    onUpdate(data);
  }

  async function completeGate(undo = false) {
    const res = await fetch('/review-gate/1/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ undo }),
    });
    const data = await res.json();
    onUpdate(data);
    setConfirming(false);
  }

  function toggleChapter(chapter) {
    setExpanded(prev => ({ ...prev, [chapter]: !prev[chapter] }));
  }

  function chapterLabel(filename) {
    return filename.replace('.md', '').replace(/-/g, ' ').replace(/^ch \d+ /, '').toUpperCase();
  }

  return (
    <div className="review-gate">
      <div className="review-gate-header">
        <div>
          <h2>Review Gate</h2>
          <p className="review-gate-subtitle">Review all flags from P0 and P1 before unlocking line edits.</p>
        </div>
        <button className="btn-secondary" onClick={buildGate}>
          Sync Flags from Latest Run
        </button>
      </div>

      <div className={`review-gate-status ${isComplete ? 'complete' : 'pending'}`}>
        {isComplete ? (
          <>
            Gate complete. {reviewed} of {total} flags reviewed.
            Completed: {gate.completed_at ? new Date(gate.completed_at).toLocaleDateString() : ''}
            <button className="btn-text" onClick={() => completeGate(true)} style={{ marginLeft: '1rem' }}>
              Reopen Gate
            </button>
          </>
        ) : (
          <>
            {reviewed} of {total} flags reviewed.
            {total === 0 && ' Run P0 and P1 on your chapters first, then click Sync.'}
          </>
        )}
      </div>

      {flags.length === 0 && (
        <div className="empty-state">
          <p>No flags found. Run Pass 0 and Pass 1 on your chapters, then click "Sync Flags from Latest Run".</p>
        </div>
      )}

      {flags.length > 0 && (
        <div className="review-filter-bar">
          <span className="review-filter-label">Show:</span>
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `All (${flags.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${flags.filter(fl => fl.decision === f).length})`}
            </button>
          ))}
        </div>
      )}

      <div className="review-gate-chapters">
        {Object.entries(byChapter).map(([chapter, chapterFlags]) => {
          const chapterReviewed = chapterFlags.filter(f => f.decision !== 'pending').length;
          const isOpen = expanded[chapter] !== false;
          return (
            <div key={chapter} className="review-chapter">
              <button
                className="review-chapter-heading"
                onClick={() => toggleChapter(chapter)}
              >
                <span>{chapterLabel(chapter)}</span>
                <span className="review-chapter-meta">
                  {chapterReviewed}/{chapterFlags.length} reviewed
                  <span className="review-expand">{isOpen ? '▲' : '▼'}</span>
                </span>
              </button>

              {isOpen && (
                <div className="review-flags">
                  {chapterFlags.map(flag => (
                    <FlagItem
                      key={flag.id}
                      flag={flag}
                      onDecision={(decision, note) => setDecision(flag.id, decision, note)}
                      disabled={isComplete}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isComplete && total > 0 && (
        <div className="review-gate-footer">
          {confirming ? (
            <div className="review-confirm">
              <p>Mark the review gate as complete? Line edits will unlock for all chapters.</p>
              <button className="btn-primary" onClick={() => completeGate(false)}>Yes, Mark Complete</button>
              <button className="btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn-primary" onClick={() => setConfirming(true)}>
              Mark Review Complete — Unlock Line Edits
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FlagItem({ flag, onDecision, disabled }) {
  const [note, setNote] = useState(flag.note || '');
  const [noteOpen, setNoteOpen] = useState(!!flag.note);

  function handleDecision(decision) {
    if (disabled) return;
    onDecision(decision, note);
  }

  function handleNoteBlur() {
    if (note !== flag.note && flag.decision !== 'pending') {
      onDecision(flag.decision, note);
    }
  }

  return (
    <div className={`flag-item-review ${flag.decision !== 'pending' ? 'reviewed' : ''}`}>
      <div className="flag-item-top">
        <span className={`pass-badge pass-badge-${flag.pass}`}>{flag.pass_label}</span>
        <span className="flag-text">{flag.text}</span>
      </div>
      <textarea
        className="flag-note"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add a note (optional) — saved automatically when you click Approve / Reject / Defer"
        rows={noteOpen || note ? 2 : 1}
        onFocus={() => setNoteOpen(true)}
        onBlur={handleNoteBlur}
        disabled={disabled}
      />
      <div className="flag-item-actions">
        <button
          className={`decision-btn ${flag.decision === 'approved' ? 'active-approve' : ''}`}
          onClick={() => handleDecision('approved')}
          disabled={disabled}
        >
          Approve
        </button>
        <button
          className={`decision-btn ${flag.decision === 'rejected' ? 'active-reject' : ''}`}
          onClick={() => handleDecision('rejected')}
          disabled={disabled}
        >
          Reject
        </button>
        <button
          className={`decision-btn ${flag.decision === 'pending' ? 'active-pending' : ''}`}
          onClick={() => handleDecision('pending')}
          disabled={disabled}
        >
          Defer
        </button>
      </div>
    </div>
  );
}
