import { useEffect, useState } from 'preact/hooks';
import { api } from './api';

type V = { latest_code: number; latest_name: string; min_code: number; message: string; notes: string };

/** Android app versions: after publishing an update on Google Play, set it here so the app offers it; raise the
 *  minimum to make an update required (older apps then ask to update before they can be used). */
export function AppVersion() {
  const [v, setV] = useState<V | null>(null);
  const [installs, setInstalls] = useState<{ code: number; users: number }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => api<{ version: V; installs: { code: number; users: number }[] }>('/admin/app').then((r) => { setV(r.version); setInstalls(r.installs); });
  useEffect(() => { load(); }, []);
  if (!v) return <p class="muted">Loading…</p>;
  const set = (k: keyof V, val: string) => setV({ ...v, [k]: k.endsWith('_code') ? Number(val) : val });
  const total = installs.reduce((s, i) => s + i.users, 0);
  const below = installs.filter((i) => i.code < v.min_code).reduce((s, i) => s + i.users, 0);
  async function save() {
    setMsg(null);
    if (!confirm(v!.min_code > 1 ? `Save? Anyone on a version older than ${v!.min_code} must update before using the app.` : 'Save these versions?')) return;
    try { await api('/admin/app', { method: 'PUT', body: v }); setMsg('Saved. Apps pick it up within 5 minutes.'); load(); }
    catch (e: any) { setMsg(e.data?.message ?? e.message); }
  }
  return (
    <>
      <div class="titlebar"><h1>App updates</h1><span class="muted">Android app versions on Google Play</span></div>
      <section class="card">
        <p class="muted small" style="margin-top:0">The website, the exam room and every page the app opens inside it update as soon as the site is deployed - no app update needed. Only the app's own screens (home, scan, bundles, plans) need a new version from Google Play.</p>
        <div class="form">
          <div class="grid3">
            <label class="field">Latest version code<input type="number" min={1} value={v.latest_code} onInput={(e) => set('latest_code', (e.target as HTMLInputElement).value)} /></label>
            <label class="field">Latest version name<input value={v.latest_name} maxLength={20} onInput={(e) => set('latest_name', (e.target as HTMLInputElement).value)} placeholder="e.g. 1.2" /></label>
            <label class="field">Minimum version code (required)<input type="number" min={1} value={v.min_code} onInput={(e) => set('min_code', (e.target as HTMLInputElement).value)} /></label>
          </div>
          <label class="field">Message shown with the update (optional)<input value={v.message} maxLength={300} onInput={(e) => set('message', (e.target as HTMLInputElement).value)} placeholder="e.g. Faster uploads and a new results screen" /></label>
          <label class="field">Notes for yourself (not shown)<textarea rows={2} value={v.notes} maxLength={1000} onInput={(e) => set('notes', (e.target as HTMLTextAreaElement).value)} /></label>
          <div class="row"><button class="btn primary" onClick={save}>Save</button>{msg && <span class="muted">{msg}</span>}</div>
        </div>
        <p class="muted small">Order: publish the new version on Google Play first, wait until it is live, then raise "Latest" here. Raise "Minimum" only for changes old apps cannot work with.</p>
      </section>
      <section class="card">
        <h2>Who is on which version</h2>
        {!installs.length ? <p class="muted">No app sign-ins recorded yet.</p> : (
          <>
            <table class="tbl"><thead><tr><th>Version code</th><th>Accounts</th><th></th></tr></thead>
              <tbody>{installs.map((i) => <tr key={i.code}><td>{i.code}{i.code === v.latest_code ? ' (latest)' : ''}</td><td>{i.users}</td><td class="muted small">{i.code < v.min_code ? 'must update' : i.code < v.latest_code ? 'update offered' : 'up to date'}</td></tr>)}</tbody></table>
            <p class="muted small">{total} accounts seen in the app{below ? ` · ${below} will be asked to update before continuing` : ''}.</p>
          </>
        )}
      </section>
    </>
  );
}
