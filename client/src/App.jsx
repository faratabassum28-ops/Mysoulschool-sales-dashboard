import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useFilters } from './FilterContext.jsx';
import FilterBar from './components/FilterBar.jsx';
import { SyncLine } from './components/ui.jsx';
import Overview from './pages/Overview.jsx';
import Programs from './pages/Programs.jsx';
import BestPeriods from './pages/BestPeriods.jsx';
import Team from './pages/Team.jsx';

const PAGES = [
  ['/', 'Sales Overview'],
  ['/programs', 'Program Performance'],
  ['/best-periods', 'Best Periods'],
  ['/team', 'Sales Team Performance'],
];

export default function App() {
  const { meta, metaError } = useFilters();
  const { pathname } = useLocation();

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>MySoulSchool Sales Dashboard</h1>
          <SyncLine meta={meta} />
        </div>
        <nav>
          {PAGES.map(([to, label], i) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <span className="num">{i + 1}</span>{label}
            </NavLink>
          ))}
        </nav>
      </header>

      {metaError && <div className="notice error">Cannot reach the API: {metaError.message}</div>}
      {meta && meta.rowCount === 0 && (
        <div className="notice">
          No data yet. The first sync runs on server start{meta.lastError ? ` (last error: ${meta.lastError.message})` : ''}.
          Check the server log or run <code>npm run sync --prefix server</code>.
        </div>
      )}

      <FilterBar showClosers={pathname === '/team'} />

      <main>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/best-periods" element={<BestPeriods />} />
          <Route path="/team" element={<Team />} />
        </Routes>
      </main>
    </div>
  );
}
