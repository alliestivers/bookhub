import { useState } from 'react';

function parseEditsContent(content) {
  if (!content) return null;

  // Split on **SUGGEST** or **FLAG** blocks (also handles numbered variants like **S-01**)
  const blockRegex = /\*\*(SUGGEST|FLAG|S-\d+|F-\d+)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const prefix = content.slice(lastIndex, match.index).trim();
      if (prefix) parts.push({ type: 'text', content: prefix });
    }
    lastIndex = match.index + match[0].length;

    // Find next block start or end of string
    const nextMatch = blockRegex.exec(content);
    const blockText = nextMatch
      ? content.slice(lastIndex, nextMatch.index)
      : content.slice(lastIndex);

    if (nextMatch) {
      // Reset so the outer loop picks up nextMatch
      blockRegex.lastIndex = nextMatch.index;
    }

    const rawType = match[1];
    const type = rawType.startsWith('S') ? 'SUGGEST' : 'FLAG';
    const originalMatch = blockText.match(/ORIGINAL:\s*([\s\S]*?)(?=\nSUGGESTED:|\nWHY:|$)/);
    const suggestedMatch = blockText.match(/SUGGESTED:\s*([\s\S]*?)(?=\nWHY:|\nORIGINAL:|$)/);
    const whyMatch = blockText.match(/WHY:\s*([\s\S]*?)(?=\nORIGINAL:|\nSUGGESTED:|$)/);

    parts.push({
      type,
      original: originalMatch ? originalMatch[1].trim() : '',
      suggested: suggestedMatch ? suggestedMatch[1].trim() : '',
      why: whyMatch ? whyMatch[1].trim() : '',
    });

    lastIndex = nextMatch ? nextMatch.index + nextMatch[0].length : content.length;
    if (!nextMatch) break;
  }

  if (lastIndex < content.length) {
    const remainder = content.slice(lastIndex).trim();
    if (remainder) parts.push({ type: 'text', content: remainder });
  }

  return parts.length > 0 ? parts : null;
}

function EditsBlock({ content, onApply }) {
  const parsed = parseEditsContent(content);

  if (!parsed) {
    return <pre className="prose-output">{content}</pre>;
  }

  return (
    <div className="edits-blocks">
      {parsed.map((block, i) => {
        if (block.type === 'text') {
          return <pre key={i} className="prose-output edits-prose">{block.content}</pre>;
        }
        const isSuggest = block.type === 'SUGGEST';
        return (
          <div key={i} className={`edit-block ${isSuggest ? 'edit-block-suggest' : 'edit-block-flag'}`}>
            <div className="edit-block-type">{block.type}</div>
            {block.original && (
              <div className="edit-original">
                <span className="edit-field-label">ORIGINAL</span>
                <span className="edit-field-text edit-original-text">{block.original}</span>
              </div>
            )}
            {block.suggested && (
              <div className="edit-suggested">
                <span className="edit-field-label">SUGGESTED</span>
                <span className="edit-field-text edit-suggested-text">{block.suggested}</span>
              </div>
            )}
            {block.why && (
              <div className="edit-why">
                <span className="edit-field-label">WHY</span>
                <em className="edit-field-text edit-why-text">{block.why}</em>
              </div>
            )}
            {isSuggest && block.original && block.suggested && (
              <button
                className="btn-apply"
                onClick={() => onApply({ original: block.original, suggested: block.suggested })}
              >
                Apply
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ResultsViewer({ result, onApply }) {
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
              <EditsBlock content={chapterResult.edits_content} onApply={onApply} />
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
