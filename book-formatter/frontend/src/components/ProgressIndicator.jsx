export default function ProgressIndicator({ title }) {
  return (
    <div className="progress">
      <div className="spinner" />
      <h2>Formatting your manuscript…</h2>
      <p>{title}</p>
      <p className="hint">This usually takes 30–90 seconds depending on manuscript length.</p>
    </div>
  );
}
