import { useEffect, useState } from 'preact/hooks';
import { api, fmtDate, rupees } from './api';
type P = { id: string; bundle_title: string; email: string | null; username: string | null; display_name: string | null; name: string | null; list_price_paise: number; paid_paise: number; coupon_code: string | null; status: string; provider: string; created_at: number; paid_at: number | null; expires_at: number | null };
type B = { id: string; title: string };
export function Purchases() {
  const [rows, setRows] = useState<P[] | null>(null);
  const [bundles, setBundles] = useState<B[]>([]);
  const [user, setUser] = useState(''); const [bundleId, setBundleId] = useState(''); const [note, setNote] = useState(''); const [msg, setMsg] = useState<string | null>(null);
  const load = () => api<{ purchases: P[] }>('/admin/purchases').then((r) => setRows(r.purchases));
  useEffect(() => { load(); api<{ bundles: B[] }>('/admin/bundles').then((r) => { setBundles(r.bundles); if (r.bundles[0]) setBundleId(r.bundles[0].id); }); }, []);
  async function grant(e: Event) {
    e.preventDefault(); setMsg(null);
    try { await api('/admin/purchases/grant', { method: 'POST', body: { bundle_id: bundleId, user: user.trim(), note: note || undefined } }); setMsg('Access granted.'); setUser(''); load(); }
    catch (err: any) { setMsg(err.code === 'user_not_found' ? 'No user with that email/username (they must have signed in once).' : err.message); }
  }
  async function revoke(p: P) { if (!confirm(`Revoke ${p.bundle_title} for ${p.email}?`)) return; await api(`/admin/purchases/${p.id}/revoke`, { method: 'POST', body: {} }); load(); }
  return (
    <>
      <div class="titlebar"><h1>Purchases</h1></div>
      <section class="card"><h2>Grant access manually</h2><p class="muted small">For offline payments, giveaways or support. The user must have signed in to paper2test.app at least once.</p>
        <form class="row wrap" onSubmit={grant}><input value={user} onInput={(e) => setUser((e.target as HTMLInputElement).value)} placeholder="email or @username" required /><select value={bundleId} onChange={(e) => setBundleId((e.target as HTMLSelectElement).value)}>{bundles.map((b) => <option value={b.id}>{b.title}</option>)}</select><input value={note} onInput={(e) => setNote((e.target as HTMLInputElement).value)} placeholder="note (optional)" /><button class="btn primary" disabled={!bundleId}>Grant</button>{msg && <span class="muted">{msg}</span>}</form>
      </section>
      <section class="card">{!rows ? <p class="muted">Loading…</p> : rows.length === 0 ? <p class="muted">No purchases yet.</p> : (
        <table class="tbl"><thead><tr><th>When</th><th>User</th><th>Bundle</th><th>Paid</th><th>Coupon</th><th>Via</th><th>Status</th><th>Expires</th><th></th></tr></thead>
          <tbody>{rows.map((p) => <tr key={p.id}><td class="muted">{fmtDate(p.paid_at ?? p.created_at)}</td><td>{p.display_name ?? p.name}<div class="muted small">{p.email}{p.username ? ` · @${p.username}` : ''}</div></td><td>{p.bundle_title}</td><td>{rupees(p.paid_paise)}{p.paid_paise !== p.list_price_paise && <span class="muted small"> (list {rupees(p.list_price_paise)})</span>}</td><td>{p.coupon_code ?? '—'}</td><td>{p.provider}</td><td><span class={`pill ${p.status === 'paid' ? 'live' : p.status === 'pending' ? 'pending' : 'ended'}`}>{p.status}</span></td><td class="muted">{p.expires_at ? fmtDate(p.expires_at) : 'lifetime'}</td><td class="right">{p.status === 'paid' && <button class="btn sm" onClick={() => revoke(p)}>Revoke</button>}</td></tr>)}</tbody></table>
      )}</section>
    </>
  );
}
