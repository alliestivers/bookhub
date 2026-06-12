import ChangeLog from './ChangeLog';

export default function ResultsPanel({ results }) {
  return (
    <div className="results-panel">
      <header>
        <h1>Your files are ready</h1>
        <p className="book-title">{results.title}</p>
      </header>

      <div className="downloads">
        {results.downloads?.epub && (
          <a href={results.downloads.epub} className="download-btn epub" target="_blank" rel="noreferrer">
            Download EPUB
            <span>Ebook (Kindle, Apple Books, Kobo)</span>
          </a>
        )}
        {results.downloads?.pdf && (
          <a href={results.downloads.pdf} className="download-btn pdf" target="_blank" rel="noreferrer">
            Download PDF
            <span>Print-ready (KDP, IngramSpark)</span>
          </a>
        )}
      </div>

      {results.change_log && <ChangeLog log={results.change_log} />}
    </div>
  );
}
