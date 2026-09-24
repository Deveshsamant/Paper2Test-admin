import { useEffect, useState } from 'preact/hooks';
import { api, rupees } from './api';

type OR = { today_usd: number | null; month_usd: number | null; total_usd: number | null; key_limit_usd: number | null; key_left_usd: number | null; balance_usd: number | null } | null;
type Stats = {
  users: number; users_7d: number; papers: number; tests: number; attempts: number; attempts_24h: number; purchases: number; revenue_paise: number; revenue_7d_paise: number;
  ai_today: { pool: string; count: number }[]; ai_month?: { pool: string; count: number }[]; ai_days?: { day: string; count: number }[]; openrouter?: OR; push_devices?: number;
};

const INR = 95; // ₹ per $1 of OpenRouter credit (incl. fee + GST, as paid)
const usd = (v: number | null | undefined) => (v == null ? '—' : `$${v.toFixed(v < 1 ? 3 : 2)} · ₹${Math.round(v * INR)}`);
const PROVIDERS: Record<string, string> = { openrouter: 'OpenRouter', 'openrouter-free': 'OpenRouter free', 'gemini-free': 'Gemini free', 'gemini-paid': 'Gemini paid', gemini: 'Gemini', nim: 'NVIDIA NIM', parser: 'Free text reader' };
/** "gemini-free:gemini-3.1-flash-lite" -> "Gemini free (gemini-3.1-flash-lite)" */
const poolName = (p: string) => {
  const i = p.indexOf(':');
  const prov = i < 0 ? p : p.slice(0, i), model = i < 0 ? '' : p.slice(i + 1);
  const name = PROVIDERS[prov] ?? prov.replace(/[_-]/g, ' ');
  return model ? `${name} (${model.split('/').pop()})` : name;
};
const paid = (p: string) => p.startsWith('openrouter:') || /paid/.test(p);

export function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { api<Stats>('/admin/stats').then(setS); }, []);
  if (!s) return <p class="muted">Loading…</p>;
  const month = new Map((s.ai_month ?? []).map((r) => [r.pool, r.count]));
  const today = new Map(s.ai_today.map((r) => [r.pool, r.count]));
  const pools = [...new Set([...month.keys(), ...today.keys()])].sort((a, b) => (month.get(b) ?? 0) - (month.get(a) ?? 0));
  const days = s.ai_days ?? [];
  const top = Math.max(1, ...days.map((d) => d.count));
  const or = s.openrouter;
  return (
    <>
      <div class="titlebar"><h1>Overview</h1></div>
      <section class="stats"><div><b>{s.users}</b>users<div class="stat">+{s.users_7d} this week</div></div><div><b>{s.attempts}</b>tests taken<div class="stat">{s.attempts_24h} in 24 h</div></div><div><b>{s.purchases}</b>purchases</div><div><b>{rupees(s.revenue_paise)}</b>revenue<div class="stat">{rupees(s.revenue_7d_paise)} this week</div></div><div><b>{s.tests}</b>tests · {s.papers} papers</div>{s.push_devices != null && <div><b>{s.push_devices}</b>devices with notifications</div>}</section>

      <section class="card">
        <h2>AI spend (OpenRouter, prepaid)</h2>
        {!or ? <p class="muted">Not available (no OpenRouter key on the API, or OpenRouter did not answer).</p> : (
          <table class="tbl"><tbody>
            <tr><td>Today</td><td class="right"><b>{usd(or.today_usd)}</b></td></tr>
            <tr><td>This month</td><td class="right"><b>{usd(or.month_usd)}</b></td></tr>
            <tr><td>Since the key was made</td><td class="right">{usd(or.total_usd)}</td></tr>
            {or.key_limit_usd != null && <tr><td>Key spending limit left</td><td class="right"><b>{usd(or.key_left_usd)}</b> of {usd(or.key_limit_usd)}</td></tr>}
            <tr><td>Account balance left</td><td class="right"><b>{usd(or.balance_usd)}</b></td></tr>
          </tbody></table>
        )}
        <p class="muted small">Top up on openrouter.ai when the balance gets low; credit does not expire monthly. ₹ at {INR} per $ (what you paid incl. fees).</p>
      </section>

      <section class="card">
        <h2>Pages read by AI</h2>
        {days.length > 0 && <div class="aibar" title="Pages read by AI per day, last 14 days">{days.map((d) => <div key={d.day} style={`height:${Math.round((d.count / top) * 100)}%`} title={`${d.day}: ${d.count}`}><span>{d.day.slice(8)}</span></div>)}</div>}
        {pools.length ? (
          <table class="tbl" style="margin-top:22px"><thead><tr><th>Provider</th><th class="right">Today</th><th class="right">This month</th><th>Cost</th></tr></thead>
            <tbody>{pools.map((p) => <tr key={p}><td>{poolName(p)}</td><td class="right">{today.get(p) ?? 0}</td><td class="right">{month.get(p) ?? 0}</td><td class="muted small">{paid(p) ? 'paid' : 'free'}</td></tr>)}</tbody></table>
        ) : <p class="muted">No AI calls this month.</p>}
        <p class="muted small">Typed PDFs uploaded on the website are read by the free text reader and don't appear here.</p>
      </section>

      <section class="card"><h2>How to publish a bundle</h2><ol class="muted small"><li>Upload the paper on <a href="https://paper2test.app/#/papers" target="_blank">paper2test.app</a> with your admin account, add its answer key, mark it ready.</li><li>Here: Bundles → New bundle → set price, attempts per test, validity, exam tags → add the ready papers → Publish.</li><li>Optionally create coupons. Purchases and manual grants are under Purchases.</li></ol></section>
    </>
  );
}
