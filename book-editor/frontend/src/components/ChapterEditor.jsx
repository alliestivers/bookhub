import { useState, useEffect, useRef } from 'react';

export default function ChapterEditor({ chapter, displayName, pendingApply, onApplyConsumed }) {
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [open, setOpen] = useState(false);
  const textareaRef = useRef(null);

  async function loadText() {
    if (!chapter) return;
    setLoading(true);
    try {
      const res = await fetch(`/chapters/1/${chapter}/text`);
      const data = await res.json();
      setText(data.text || '');
      setSavedText(data.text || '');
    } catch (e) {
      setText('');
      setSavedText('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (chapter) loadText();
  }, [chapter]);

  // Watch for pendingApply
  useEffect(() => {
    if (!pendingApply) return;
    const { original, suggested } = pendingApply;

    async function applyPending() {
      // Load fresh text if we don't have it
      let currentText = text;
      if (!currentText && chapter) {
        try {
          const res = await fetch(`/chapters/1/${chapter}/text`);
          const data = await res.json();
          currentText = data.text || '';
          setSavedText(currentText);
        } catch (e) {}
      }

      if (currentText.includes(original)) {
        const newText = currentText.replace(original, suggested);
        setText(newText);
        setOpen(true);
        setTimeout(() => textareaRef.current?.focus(), 100);
      } else {
        // Try trimmed match
        const trimmedOriginal = original.trim();
        const idx = currentText.indexOf(trimmedOriginal);
        if (idx !== -1) {
          const newText = currentText.slice(0, idx) + suggested + currentText.slice(idx + trimmedOriginal.length);
          setText(newText);
          setOpen(true);
          setTimeout(() => textareaRef.current?.focus(), 100);
        }
      }
      onApplyConsumed?.();
    }

    applyPending();
  }, [pendingApply]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/chapters/1/${chapter}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      setSavedText(text);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = text !== savedText;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="chapter-editor-section">
      <button
        className="chapter-editor-toggle"
        onClick={() => setOpen(o => !o)}
      >
        <span>Edit Chapter Text</span>
        <span className="toggle-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="chapter-editor-body">
          {loading ? (
            <div className="muted" style={{ padding: '1rem' }}>Loading chapter text…</div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                className="chapter-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                spellCheck={false}
              />
              <div className="chapter-editor-footer">
                <span className="chapter-editor-counts">
                  {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
                </span>
                <div className="chapter-editor-actions">
                  {hasChanges && (
                    <button
                      className="btn-secondary"
                      onClick={() => setText(savedText)}
                    >
                      Discard Changes
                    </button>
                  )}
                  <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                  >
                    {saving ? 'Saving…' : savedMsg ? 'Saved ✓' : 'Save'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
