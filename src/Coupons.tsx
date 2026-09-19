import { useEffect, useState } from 'preact/hooks';
import { api, fmtDate, fromPaise, rupees, toPaise } from './api';
type C = { code: string; percent_off: number; flat_off_paise: number; bundle_id: string | null; bundle_title: string | null; max_uses: number | null; used_count: number; expires_at: number | null; active: number };
type B = { id: string; title: string };
export function Coupons() {
  const [rows, setRows] = useState<C[] | null>(null);
  const [bundles, setBundles] = useState<B[]>([]);
  const [f, setF] = useState({ code: '', percent_off: '10', flat_off: '', bundle_id: '', max_uses: '', expires: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => api<{ coupons: C[] }>('/admin/coupons').then((r) => setRows(r.coupons));
  useEffect(() => { load(); api<{ bundles: B[] }>('/admin/bundles').then((r) => setBundles(r.bundles)); }, []);
  const set = (k: string) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  async function create(e: Event) {
    e.preventDefault(); setMsg(null);
    try {
      await api('/admin/coupons', { method: 'POST', body: { code: f.code.trim(), percent_off: Number(f.percent_off || 0), flat_off_paise: toPaise(f.flat_off), bundle_id: f.bundle_id || null, max_uses: f.max_uses ? Number(f.max_uses) : null, expires_at: f.expires ? new Date(f.expires).getTime() : null, active: true } });
      setF({ ...f, code: '' }); load(); setMsg('Coupon created.');
    } catch (err: any) { setMsg(err.code === 'code_taken' ? 'That code already exists.' : err.data?.issues?.[0]?.message ?? err.message); }
  }
  async function toggle(c: C) { await api(`/admin/coupons/${c.code}`, { method: 'PUT', body: { active: !c.active } }); load(); }
  async function remove(c: C) { if (!confirm(`Delete coupon ${c.code}?`)) return; await api(`/admin/coupons/${c.code}`, { method: 'DELETE' }); load(); }
  return (
    <>
      <div class="titlebar"><h1>Coupons</h1></div>
      <section class="card"><h2>New coupon</h2>
        <form class="row wrap" onSubmit={create}>
          <input value={f.code} onInput={set('code')} placeholder="CODE (e.g. UPSC20)" required style="width:160px" />
          <label class="chk">% off <input type="number" min={0} max={100} value={f.percent_off} onInput={set('percent_off')} style="width:70px" /></label>
          <label class="chk">flat ₹ off <input type="number" min={0} step="1" value={f.flat_off} onInput={set('flat_off')} style="width:90px" /></label>
          <select value={f.bundle_id} onChange={set('bundle_id')}><option value="">Any bundle</option>{bundles.map((b) => <option value={b.id}>{b.title}</option>)}</select>
          <label class="chk">max uses <input type="number" min={1} value={f.max_uses} onInput={set('max_uses')} placeholder="∞" style="width:80px" /></label>
          <label class="chk">expires <input type="date" value={f.expires} onInput={set('expires')} /></label>
          <button class="btn primary">Create</button>{msg && <span class="muted">{msg}</span>}
        </form>
      </section>
      <section class="card">{!rows ? <p class="muted">Loading…</p> : rows.length === 0 ? <p class="muted">No coupons yet.</p> : (
        <table class="tbl"><thead><tr><th>Code</th><th>Discount</th><th>Bundle</th><th>Used</th><th>Expires</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((c) => <tr key={c.code}><td><code>{c.code}</code></td><td>{c.percent_off ? `${c.percent_off}%` : ''}{c.percent_off && c.flat_off_paise ? ' + ' : ''}{c.flat_off_paise ? rupees(c.flat_off_paise) : ''}{!c.percent_off && !c.flat_off_paise ? '—' : ''}</td><td>{c.bundle_title ?? 'any'}</td><td>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td><td class="muted">{c.expires_at ? fmtDate(c.expires_at) : 'never'}</td><td><span class={`pill ${c.active ? 'live' : 'ended'}`}>{c.active ? 'active' : 'off'}</span></td><td class="right"><button class="btn sm" onClick={() => toggle(c)}>{c.active ? 'Disable' : 'Enable'}</button> <button class="btn sm" onClick={() => remove(c)}>Delete</button></td></tr>)}</tbody></table>
      )}</section>
    </>
  );
}
