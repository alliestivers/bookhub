import { useState } from 'react';
import { formatManuscript } from '../services/api';
import ProgressIndicator from './ProgressIndicator';

export default function UploadForm({ onResults }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [trimSize, setTrimSize] = useState('6x9');
  const [formatType, setFormatType] = useState('both');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || !title) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('trim_size', trimSize);
    formData.append('format_type', formatType);

    try {
      const results = await formatManuscript(formData);
      onResults(results);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <ProgressIndicator title={title} />;
  }

  return (
    <div className="upload-form">
      <header>
        <h1>Book Formatter</h1>
        <p>Upload your manuscript and we'll format it for KDP and IngramSpark — print and ebook ready.</p>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="title">Book Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter your book title"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="file">Manuscript File (.docx)</label>
          <input
            id="file"
            type="file"
            accept=".docx"
            onChange={e => setFile(e.target.files[0])}
            required
          />
          {file && <span className="file-name">{file.name}</span>}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="trimSize">Trim Size</label>
            <select
              id="trimSize"
              value={trimSize}
              onChange={e => setTrimSize(e.target.value)}
            >
              <option value="6x9">6 × 9 (Most common)</option>
              <option value="5.5x8.5">5.5 × 8.5</option>
              <option value="5x8">5 × 8</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="formatType">Format For</label>
            <select
              id="formatType"
              value={formatType}
              onChange={e => setFormatType(e.target.value)}
            >
              <option value="both">Print + Ebook</option>
              <option value="print">Print Only (PDF)</option>
              <option value="ebook">Ebook Only (EPUB)</option>
            </select>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="submit-btn">
          Format My Book
        </button>
      </form>
    </div>
  );
}
