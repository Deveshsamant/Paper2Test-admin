import { useEffect, useState } from 'preact/hooks';
import { api, fmtDate } from './api';

type A = { id: string; title: string; body: string; url: string | null; audience: string | null; users: number; created_at: number };
type Cat = { id: string; name: string; exams: { code: string; name: string }[] };

/** Push notification to everyone (or to students of one exam) who allowed announcements. */
export function Announcements() {
  const [data, setData] = useState<{ announcements: A[]; devices: number; android: number; push_ready: boolean } | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [f, setF] = useState({ title: '', body: '', url: '', exam: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api('/admin/announcements').then(setData);
  useEffect(() => { load(); api<{ categories: Cat[] }>('/exams').then((r) => setCats(r.categories)).catch(() => {}); }, []);
  const set = (k: string) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  const examName = (code: string | null) => (code ? cats.flatMap((c) => c.exams).find((e) => e.code === code)?.name ?? code : 'everyone');

  async function send(e: Event) {
    e.preventDefault(); setMsg(null);
    if (!confirm(`Send "${f.title}" to ${f.exam ? `students of ${examName(f.exam)}` : 'everyone'} with notifications on?`)) return;
    setBusy(true);
    try {
      const r = await api<{ users: number }>('/admin/announcements', { method: 'POST', body: { title: f.title.trim(), body: f.body.trim(), url: f.url.trim() || null, exam: f.exam || null } });
      setMsg(`Sent to ${r.users} ${r.users === 1 ? 'person' : 'people'}.`); setF({ title: '', body: '', url: '', exam: f.exam }); load();
    } catch (err: any) { setMsg(err.code === 'push_not_configured' ? 'Push is not set up yet (Firebase service account missing).' : err.data?.message ?? err.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div class="titlebar"><h1>Announcements</h1>{data && <span class="muted">{data.devices} devices with notifications on ({data.android} Android, {data.devices - data.android} browsers)</span>}</div>
      {data && !data.push_ready && <section class="card notice">Push notifications are not set up yet: add the Firebase service account as the <code>FCM_SERVICE_ACCOUNT</code> secret on the API.</section>}
      <section class="card form">
        <h2>New announcement</h2>
        <form onSubmit={send}>
          <label class="field">Title<input value={f.title} onInput={set('title')} maxLength={80} required placeholder="e.g. SSC CGL mock series is live" /></label>
          <label class="field">Message<input value={f.body} onInput={set('body')} maxLength={300} required placeholder="One or two short lines" /></label>
          <div class="grid3">
            <label class="field">Opens (optional)<input value={f.url} onInput={set('url')} placeholder="/#/store or /#/exams/ssc" /></label>
            <label class="field">Send to<select value={f.exam} onChange={set('exam')}><option value="">Everyone</option>{cats.map((c) => <optgroup key={c.id} label={c.name}>{c.exams.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}</optgroup>)}</select></label>
          </div>
          <div class="row"><button class="btn primary" disabled={busy || !data?.push_ready}>Send</button>{msg && <span class="muted">{msg}</span>}</div>
        </form>
      </section>
      <section class="card">{!data ? <p class="muted">Loading…</p> : data.announcements.length === 0 ? <p class="muted">Nothing sent yet.</p> : (
        <table class="tbl"><thead><tr><th>Sent</th><th>Announcement</th><th>To</th><th>People</th></tr></thead>
          <tbody>{data.announcements.map((a) => <tr key={a.id}><td class="muted">{fmtDate(a.created_at)}</td><td><b>{a.title}</b><div class="muted small">{a.body}{a.url ? ` · ${a.url}` : ''}</div></td><td>{examName(a.audience)}</td><td>{a.users}</td></tr>)}</tbody></table>
      )}</section>
    </>
  );
}
