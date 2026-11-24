import { useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApi } from '../api.js';
import { useFilters } from '../FilterContext.jsx';
import { Card, NewBadge, Status, Switch } from '../components/ui.jsx';
import {
  colorFor, fmtMetric, fmtPeriod, int, lakh, lakhShort, pct,
} from '../format.js';

const GRAN = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
];
const MET = [{ key: 'programFee', label: 'Program Fee' }, { key: 'enrollments', label: 'Enrollments' }];

function NotTaggedCard({ nt }) {
  const ok = nt.pct <= nt.target;
  return (
    <Card className={`callout ${ok ? 'ok' : 'warn'}`}>
      <p className="eyebrow">Not Tagged % <NewBadge /></p>
      <p className="big">{pct(nt.pct)}</p>
      <p className="what">Target: {nt.target}% {ok ? '— on target' : '— needs tagging'}</p>
      <p className="muted">{int(nt.enrollments)} of {int(nt.total)} enrollments have a blank Closed By · {lakh(nt.programFee)} Program Fee</p>
    </Card>
  );
}

export default function Team() {
  const { filters } = useFilters();
  const [gran, setGran] = useState('monthly');
  const [metric, setMetric] = useState('programFee');
  const { data, loading, error } = useApi('/team', {
    from: filters.from, to: filters.to, programs: filters.programs, closers: filters.closers, granularity: gran,
  });
  const metricSwitch = <Switch options={MET} value={metric} onChange={setMetric} />;

  return (
    <>
      <div className="toolbar">
        <span className="muted">View</span>
        <Switch options={GRAN} value={gran} onChange={setGran} />
      </div>
      <Status loading={loading} error={error} empty={!data} />
      {data && (
        <div className={loading ? 'fading' : ''}>
          <div className="grid two-one">
            <Card title="Leaderboard by Closed By" subtitle="Selected date range, ranked by Program Fee">
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>#</th><th>Closed By</th>
                      <th className="r">Enrollments <NewBadge /></th>
                      <th className="r">Program Fee</th>
                      <th className="r">Amount Received</th>
                      <th className="r">Amount Due</th>
                      <th className="r">Avg Program Fee <NewBadge /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((r) => (
                      <tr key={r.closedBy}>
                        <td>{r.rank}</td>
                        <td><span className="dot" style={{ background: colorFor(r.closedBy, data.closers) }} />{r.closedBy}</td>
                        <td className="r">{int(r.enrollments)}</td>
                        <td className="r">{lakh(r.programFee)}</td>
                        <td className="r">{lakh(r.amountReceived)}</td>
                        <td className="r">{lakh(r.amountDue)}</td>
                        <td className="r">{lakh(r.avgProgramFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <NotTaggedCard nt={data.notTagged} />
          </div>

          <Card
            title={`Trend per closer – ${GRAN.find((g) => g.key === gran).label}`}
            subtitle="One line per Closed By value"
            right={metricSwitch}
          >
            <div className="chart">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={data.trend[metric]} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="key" tickFormatter={(k) => fmtPeriod(k, gran)} minTickGap={32} />
                  <YAxis tickFormatter={(v) => (metric === 'enrollments' ? int(v) : lakhShort(v))} width={56} />
                  <Tooltip labelFormatter={(k) => fmtPeriod(k, gran)} formatter={(v, name) => [fmtMetric(metric, v), name]} />
                  <Legend />
                  {data.closers.map((c) => (
                    <Line isAnimationActive={false} key={c} type="monotone" dataKey={c} stroke={colorFor(c, data.closers)} strokeWidth={2} dot={false}
                      strokeDasharray={c === 'Not Tagged' ? '5 4' : undefined} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Who sells what" subtitle="Closed By × Program" right={metricSwitch}>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Closed By</th>
                    {data.programs.map((p) => <th key={p} className="r">{p}</th>)}
                    <th className="r">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.matrix.map((r) => (
                    <tr key={r.closedBy}>
                      <td><span className="dot" style={{ background: colorFor(r.closedBy, data.closers) }} />{r.closedBy}</td>
                      {data.programs.map((p) => (
                        <td key={p} className="r">{r.cells[p][metric] ? fmtMetric(metric, r.cells[p][metric]) : '–'}</td>
                      ))}
                      <td className="r strong">{fmtMetric(metric, r.total[metric])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={`${GRAN.find((g) => g.key === gran).label} breakdown`} subtitle="Most recent 30 periods" right={metricSwitch}>
            <div className="table-wrap tall">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Period</th>
                    {data.closers.map((c) => <th key={c} className="r">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...data.trend[metric]].reverse().slice(0, 30).map((row) => (
                    <tr key={row.key}>
                      <td>{fmtPeriod(row.key, gran)}</td>
                      {data.closers.map((c) => <td key={c} className="r">{row[c] ? fmtMetric(metric, row[c]) : '–'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
