import { useEffect, useState } from 'preact/hooks';
import { api, rupees } from './api';
type Stats = { users: number; users_7d: number; papers: number; tests: number; attempts: number; attempts_24h: number; purchases: number; revenue_paise: number; revenue_7d_paise: number; ai_today: { pool: string; count: number }[] };
export function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { api<Stats>('/admin/stats').then(setS); }, []);
  if (!s) return <p class="muted">Loading…</p>;
  return (
    <>
      <div class="titlebar"><h1>Overview</h1></div>
      <section class="stats"><div><b>{s.users}</b>users<div class="stat">+{s.users_7d} this week</div></div><div><b>{s.attempts}</b>tests taken<div class="stat">{s.attempts_24h} in 24 h</div></div><div><b>{s.purchases}</b>purchases</div><div><b>{rupees(s.revenue_paise)}</b>revenue<div class="stat">{rupees(s.revenue_7d_paise)} this week</div></div><div><b>{s.tests}</b>tests · {s.papers} papers</div></section>
      <section class="card"><h2>AI usage today (free-tier pools)</h2>{s.ai_today.length ? <table class="tbl"><tbody>{s.ai_today.map((p) => <tr key={p.pool}><td>{p.pool}</td><td class="right">{p.count}</td></tr>)}</tbody></table> : <p class="muted">No AI calls yet today.</p>}</section>
      <section class="card"><h2>How to publish a bundle</h2><ol class="muted small"><li>Upload the paper on <a href="https://paper2test.app/#/papers" target="_blank">paper2test.app</a> with your admin account, add its answer key, mark it ready.</li><li>Here: Bundles → New bundle → set price, attempts per test, validity → add the ready papers → Publish.</li><li>Optionally create coupons. Purchases and manual grants are under Purchases.</li></ol></section>
    </>
  );
}
