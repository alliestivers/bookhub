import { useState } from 'react';

export default function ManuscriptUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('book_number', '1');

    try {
      const res = await fetch('/manuscript/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setResult(data);
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="upload-panel">
      <h2>Upload Manuscript</h2>
      <p>Upload your Book 1 manuscript (.docx or .md). The system will split it into chapters automatically.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Manuscript file (.docx or .md)</label>
          <input type="file" accept=".docx,.md,.txt" onChange={e => setFile(e.target.files[0])} required />
          {file && <span className="file-name">{file.name}</span>}
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Processing...' : 'Upload and Split Chapters'}
        </button>
      </form>

      {result && (
        <div className="upload-result">
          <h3>Chapters detected: {result.total_chapters}</h3>
          <p>Total word count: {result.total_words?.toLocaleString()}</p>
          {result.ambiguous_boundaries?.length > 0 && (
            <div className="warning">
              <strong>Ambiguous chapter boundaries detected -- review before proceeding:</strong>
              <ul>{result.ambiguous_boundaries.map((a, i) => <li key={i}>{a.heading}: {a.preview}</li>)}</ul>
            </div>
          )}
          <div className="chapter-preview">
            {result.chapters?.map(ch => (
              <div key={ch.filename} className={`chapter-row ${ch.is_kenna ? 'kenna' : ''}`}>
                <span className="ch-name">{ch.filename}</span>
                <span className="ch-words">{ch.word_count} words</span>
                {ch.is_kenna && <span className="kenna-badge">LOCKED (Kenna letter)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
