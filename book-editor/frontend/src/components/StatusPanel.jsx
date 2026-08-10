import { useState, useEffect } from 'react';

const PASS_NAMES = { 0: 'Ingest', 1: 'Developmental', 2: 'Line Edit', 3: 'Copyedit', 4: 'Formatting' };

export default function StatusPanel({ status, onRefresh }) {
  const [costs, setCosts] = useState(null);

  function loadCosts() {
    fetch('/workspace/costs/1').then(r => r.json()).then(setCosts).catch(() => {});
  }

  useEffect(() => { loadCosts(); }, []);

  if (!status) return <div className="logs-panel"><p>Loading...</p></div>;

  return (
    <div className="logs-panel">
      <div className="logs-header">
        <h2>Session Logs</h2>
        <button className="btn-secondary" onClick={() => { onRefresh(); loadCosts(); }}>Refresh</button>
      </div>

      {costs && (
        <div className="cost-summary">
          <div className="cost-total">
            <span className="cost-total-label">Estimated API cost, this manuscript</span>
            <span className="cost-total-value">${costs.total_cost_usd.toFixed(2)}</span>
          </div>
          <div className="cost-breakdown">
            {Object.entries(costs.by_pass).sort().map(([passNum, data]) => (
              <div key={passNum} className="cost-pass-row">
                <span className="cost-pass-name">{PASS_NAMES[passNum] || `Pass ${passNum}`}</span>
                <span className="cost-pass-calls">{data.calls} calls</span>
                <span className="cost-pass-cost">${data.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="cost-disclaimer">
            Estimate based on token counts returned by the API and approximate per-token pricing -- check console.anthropic.com for exact billing.
          </p>
        </div>
      )}

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
