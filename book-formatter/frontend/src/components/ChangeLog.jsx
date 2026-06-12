import { useState } from 'react';

export default function ChangeLog({ log }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="change-log">
      <button className="toggle-btn" onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Show'} Change Log & Flags
      </button>
      {open && (
        <pre className="log-content">{log}</pre>
      )}
    </div>
  );
}
