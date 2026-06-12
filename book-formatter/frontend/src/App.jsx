import { useState } from 'react';
import UploadForm from './components/UploadForm';
import ResultsPanel from './components/ResultsPanel';

export default function App() {
  const [results, setResults] = useState(null);

  return (
    <div className="app">
      {!results ? (
        <UploadForm onResults={setResults} />
      ) : (
        <>
          <ResultsPanel results={results} />
          <div className="reset-container">
            <button className="reset-btn" onClick={() => setResults(null)}>
              Format another book
            </button>
          </div>
        </>
      )}
    </div>
  );
}
