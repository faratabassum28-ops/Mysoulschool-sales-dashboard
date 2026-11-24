import { fmtDate } from '../format.js';

export const NewBadge = () => <span className="new" title="New item added on top of the sheet's columns">NEW</span>;

export function Card({ title, subtitle, right, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Switch({ options, value, onChange }) {
  return (
    <div className="switch" role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          className={value === o.key ? 'on' : ''}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Growth % [NEW]. `invert` flips the colours for Amount Due, where up is bad.
export function Growth({ value, invert = false, vs }) {
  if (value === null || value === undefined) {
    return <span className="growth flat" title={`Nothing to compare with in ${vs || 'the previous period'}`}>—</span>;
  }
  const up = value > 0; const down = value < 0;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  return (
    <span className={`growth ${good ? 'good' : bad ? 'bad' : 'flat'}`} title={`vs ${vs || 'previous period'}`}>
      {up ? '▲' : down ? '▼' : '•'} {Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%
    </span>
  );
}

export function Status({ loading, error, empty }) {
  if (error) return <div className="notice error">Could not load data: {error.message}</div>;
  if (loading && empty) return <div className="notice">Loading…</div>;
  return null;
}

export function SyncLine({ meta }) {
  if (!meta) return null;
  const s = meta.lastSync;
  if (!s) return <span className="muted">No data synced yet</span>;
  const at = new Date(s.at).toLocaleString('en-IN', { timeZone: meta.tz, dateStyle: 'medium', timeStyle: 'short' });
  return (
    <span className="muted" title={`${s.stats?.kept ?? meta.rowCount} enrollments after cleaning · source: ${s.source}`}>
      Data as of {meta.maxDate ? fmtDate(meta.maxDate) : '—'} · synced {at}
    </span>
  );
}
