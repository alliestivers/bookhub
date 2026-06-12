import ChangeLog from './ChangeLog';

async function handleDownload(e, url, filename) {
  e.preventDefault();
  const response = await fetch(url);
  const blob = await response.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ResultsPanel({ results }) {
  return (
    <div className="results-panel">
      <header>
        <h1>Your files are ready</h1>
        <p className="book-title">{results.title}</p>
      </header>

      <div className="downloads">
        {results.downloads?.epub && (
          <a
            href={results.downloads.epub}
            className="download-btn epub"
            download={`${results.title}.epub`}
            onClick={e => handleDownload(e, results.downloads.epub, `${results.title}.epub`)}
          >
            Download EPUB
            <span>Ebook (Kindle, Apple Books, Kobo)</span>
          </a>
        )}
        {results.downloads?.pdf && (
          <a
            href={results.downloads.pdf}
            className="download-btn pdf"
            download={`${results.title}.pdf`}
            onClick={e => handleDownload(e, results.downloads.pdf, `${results.title}.pdf`)}
          >
            Download PDF
            <span>Print-ready (KDP, IngramSpark)</span>
          </a>
        )}
      </div>

      {results.change_log && <ChangeLog log={results.change_log} />}
    </div>
  );
}
