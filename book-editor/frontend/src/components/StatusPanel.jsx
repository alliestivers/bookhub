export default function StatusPanel({ status, onRefresh }) {
  if (!status) return <div className="logs-panel"><p>Loading...</p></div>;

  return (
    <div className="logs-panel">
      <div className="logs-header">
        <h2>Session Logs</h2>
        <button className="btn-secondary" onClick={onRefresh}>Refresh</button>
      </div>

      <div className="log-grid">
        <div className="log-block">
          <h3>Status</h3>
          <pre>{status.status || 'No status yet.'}</pre>
        </div>

        <div className="log-block">
          <h3>Questions for Allie</h3>
          <pre>{status.questions_for_allie || 'No flags yet.'}</pre>
        </div>

        <div className="log-block">
          <h3>Decisions Log</h3>
          <pre>{status.decisions_log || 'No fixes logged yet.'}</pre>
        </div>

        <div className="log-block">
          <h3>Continuity Log</h3>
          <pre>{status.continuity_log || 'No continuity notes yet. Run Pass 0 first.'}</pre>
        </div>
      </div>
    </div>
  );
}
