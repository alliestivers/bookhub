import { useState, useEffect } from 'react';

export default function ReferenceManager() {
  const [docs, setDocs] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [text, setText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/reference')
      .then(r => r.json())
      .then(d => {
        setDocs(d.docs || []);
        if (d.docs?.length > 0) setActiveKey(d.docs[0].key);
      });
  }, []);

  useEffect(() => {
    if (!activeKey) return;
    setLoading(true);
    fetch(`/reference/${activeKey}`)
      .then(r => r.json())
      .then(d => {
        setText(d.text || '');
        setOriginalText(d.text || '');
        setLoading(false);
      });
  }, [activeKey]);

  async function save() {
    await fetch(`/reference/${activeKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    setOriginalText(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    fetch('/reference').then(r => r.json()).then(d => setDocs(d.docs || []));
  }

  const activeDoc = docs.find(d => d.key === activeKey);
  const isDirty = text !== originalText;

  return (
    <div className="reference-manager">
      <div className="reference-header">
        <h2>Reference Documents</h2>
        <p className="review-gate-subtitle">
          These documents guide every editorial pass. Update them any time your rules, voice, or character names change.
        </p>
      </div>

      <div className="reference-layout">
        <aside className="reference-sidebar">
          {docs.map(doc => (
            <button
              key={doc.key}
              className={`reference-doc-btn ${activeKey === doc.key ? 'active' : ''}`}
              onClick={() => setActiveKey(doc.key)}
            >
              <span>{doc.label}</span>
              {!doc.exists && <span className="reference-empty-badge">Empty</span>}
            </button>
          ))}
        </aside>

        <main className="reference-main">
          {loading ? (
            <p className="muted">Loading...</p>
          ) : (
            <>
              <div className="reference-toolbar">
                <h3>{activeDoc?.label}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {saved && <span className="saved-indicator">Saved</span>}
                  <button className="btn-primary" onClick={save} disabled={!isDirty}>
                    Save
                  </button>
                </div>
              </div>
              <textarea
                className="reference-editor"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Write or paste your ${activeDoc?.label.toLowerCase()} here...`}
                spellCheck={false}
              />
              <div className="reference-meta">
                {text.split(/\s+/).filter(Boolean).length} words
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
