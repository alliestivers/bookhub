import { useState, useRef } from 'react';

export default function ChapterManager({ chapters, onChaptersChange }) {
  const [editingName, setEditingName] = useState(null); // filename being edited
  const [editValue, setEditValue] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInputRef = useRef(null);

  async function handleRename(filename) {
    if (!editValue.trim() || editValue === editingName) {
      setEditingName(null);
      return;
    }
    await fetch('/chapters/1/rename-display', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, display_name: editValue.trim() }),
    });
    setEditingName(null);
    onChaptersChange();
  }

  async function handleDelete(filename) {
    await fetch(`/chapters/1/${filename}`, { method: 'DELETE' });
    setConfirmDelete(null);
    onChaptersChange();
  }

  function handleDragStart(e, filename) {
    setDragging(filename);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, filename) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (filename !== dragging) setDragOver(filename);
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  async function handleDrop(e, targetFilename) {
    e.preventDefault();
    setDragOver(null);
    if (!dragging || dragging === targetFilename) { setDragging(null); return; }

    const fromIndex = chapters.findIndex(c => c.filename === dragging);
    const toIndex = chapters.findIndex(c => c.filename === targetFilename);
    if (fromIndex === -1 || toIndex === -1) { setDragging(null); return; }

    const reordered = [...chapters];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updated = reordered.map((ch, i) => ({ ...ch, order: i }));

    setDragging(null);
    // Optimistically update, then persist
    await fetch('/chapters/1/manifest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapters: updated }),
    });
    onChaptersChange();
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    await fetch('/chapters/1/upload', { method: 'POST', body: fd });
    e.target.value = '';
    onChaptersChange();
  }

  function handleDownload(filename) {
    window.location.href = `/chapters/1/${filename}/download`;
  }

  return (
    <div className="chapter-manager">
      <div className="chapter-manager-header">
        <h2>Chapter Manager</h2>
        <button className="btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>
          Upload New Chapter
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
      </div>

      {chapters.length === 0 ? (
        <div className="empty-state"><p>No chapters found. Upload a chapter to get started.</p></div>
      ) : (
        <div className="cm-list">
          <div className="cm-list-header">
            <span className="cm-col-handle"></span>
            <span className="cm-col-name">Display Name / Filename</span>
            <span className="cm-col-status">Status</span>
            <span className="cm-col-actions">Actions</span>
          </div>
          {chapters.map(ch => (
            <div
              key={ch.filename}
              className={`cm-row${dragOver === ch.filename ? ' cm-drag-over' : ''}${dragging === ch.filename ? ' cm-dragging' : ''}`}
              draggable
              onDragStart={e => handleDragStart(e, ch.filename)}
              onDragOver={e => handleDragOver(e, ch.filename)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, ch.filename)}
              onDragEnd={handleDragEnd}
            >
              <span className="cm-handle" title="Drag to reorder">⠿</span>

              <span className="cm-col-name">
                {editingName === ch.filename ? (
                  <input
                    className="cm-name-input"
                    value={editValue}
                    autoFocus
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(ch.filename);
                      if (e.key === 'Escape') setEditingName(null);
                    }}
                    onBlur={() => handleRename(ch.filename)}
                  />
                ) : (
                  <span
                    className="cm-display-name"
                    onClick={() => { setEditingName(ch.filename); setEditValue(ch.display_name); }}
                    title="Click to edit display name"
                  >
                    {ch.display_name}
                  </span>
                )}
                <span className="cm-filename">{ch.filename}</span>
              </span>

              <span className="cm-col-status">
                {ch.has_summary && <span className="pass-dot">P0</span>}
                {ch.has_p1_edit && <span className="pass-dot">P1</span>}
                {ch.has_p2_edit && <span className="pass-dot">P2</span>}
              </span>

              <span className="cm-col-actions">
                <button
                  className="btn-secondary btn-xs"
                  onClick={() => handleDownload(ch.filename)}
                  title="Download chapter"
                >
                  ↓
                </button>
                {confirmDelete === ch.filename ? (
                  <>
                    <button className="btn-danger btn-xs" onClick={() => handleDelete(ch.filename)}>Confirm</button>
                    <button className="btn-secondary btn-xs" onClick={() => setConfirmDelete(null)}>Cancel</button>
                  </>
                ) : (
                  <button
                    className="btn-danger btn-xs"
                    onClick={() => setConfirmDelete(ch.filename)}
                    title="Delete chapter"
                  >
                    ✕
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
