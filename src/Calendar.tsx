import { useEffect, useState } from 'preact/hooks';
import { api } from './api';

type Ev = { id: string; exam_code: string; title: string; form_opens: string | null; form_closes: string | null; admit_card: string | null; exam_date: string | null; result_date: string | null; link: string | null; notes: string | null; status: string };
type Cat = { id: string; name: string; exams: { code: string; name: string }[] };
const DATES: [keyof Ev, string][] = [['form_opens', 'Form opens'], ['form_closes', 'Last date'], ['admit_card', 'Admit card'], ['exam_date', 'Exam'], ['result_date', 'Result']];
const EMPTY = { exam_code: '', title: '', form_opens: '', form_closes: '', admit_card: '', exam_date: '', result_date: '', link: '', notes: '', status: 'published' };

/** Exam calendar: one entry per exam cycle. Students who chose that exam see alerts on their home screen. */
export function Calendar() {
  const [rows, setRows] = useState<Ev[] | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [f, setF] = useState<Record<string, string>>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => api<{ events: Ev[] }>('/admin/calendar').then((r) => setRows(r.events));
  useEffect(() => { load(); api<{ categories: Cat[] }>('/exams').then((r) => { setCats(r.categories); setF((x) => ({ ...x, exam_code: x.exam_code || r.categories[0]?.exams[0]?.code || '' })); }); }, []);
  const set = (k: string) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });
  const name = (code: string) => cats.flatMap((c) => c.exams).find((e) => e.code === code)?.name ?? code;

  async function save(e: Event) {
    e.preventDefault(); setMsg(null);
    const body: Record<string, unknown> = { exam_code: f.exam_code, title: f.title.trim(), link: f.link.trim() || null, notes: f.notes.trim() || null, status: f.status };
    for (const [k] of DATES) body[k] = f[k] || null;
    try {
      await api(editing ? `/admin/calendar/${editing}` : '/admin/calendar', { method: editing ? 'PUT' : 'POST', body });
      setMsg(editing ? 'Saved.' : 'Added.'); setEditing(null); setF({ ...EMPTY, exam_code: f.exam_code }); load();
    } catch (err: any) { setMsg(err.data?.message ?? err.message); }
  }
  function edit(ev: Ev) {
    setEditing(ev.id);
    setF({ exam_code: ev.exam_code, title: ev.title, form_opens: ev.form_opens ?? '', form_closes: ev.form_closes ?? '', admit_card: ev.admit_card ?? '', exam_date: ev.exam_date ?? '', result_date: ev.result_date ?? '', link: ev.link ?? '', notes: ev.notes ?? '', status: ev.status });
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function remove(ev: Ev) { if (!confirm(`Delete "${ev.title}"?`)) return; await api(`/admin/calendar/${ev.id}`, { method: 'DELETE' }); load(); }

  return (
    <>
      <div class="titlebar"><h1>Exam calendar</h1><span class="muted">Students who follow an exam see these dates as alerts ("form closes in 3 days").</span></div>
      <section class="card form">
        <h2>{editing ? 'Edit entry' : 'New entry'}</h2>
        <form onSubmit={save}>
          <div class="grid3">
            <label class="field">Exam<select value={f.exam_code} onChange={set('exam_code')}>{cats.map((c) => <optgroup key={c.id} label={c.name}>{c.exams.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}</optgroup>)}</select></label>
            <label class="field">Title<input value={f.title} onInput={set('title')} placeholder="e.g. SSC CGL 2026" required maxLength={120} /></label>
            <label class="field">Status<select value={f.status} onChange={set('status')}><option value="published">published</option><option value="draft">draft (hidden)</option></select></label>
          </div>
          <div class="grid3">{DATES.map(([k, label]) => <label key={k} class="field">{label}<input type="date" value={f[k]} onInput={set(k)} /></label>)}</div>
          <label class="field">Official link<input type="url" value={f.link} onInput={set('link')} placeholder="https://ssc.gov.in/..." /></label>
          <label class="field">Notes<input value={f.notes} onInput={set('notes')} maxLength={1000} placeholder="e.g. Tier 1 dates; Tier 2 announced later" /></label>
          <div class="row"><button class="btn primary">{editing ? 'Save' : 'Add'}</button>{editing && <button type="button" class="btn" onClick={() => { setEditing(null); setF({ ...EMPTY, exam_code: f.exam_code }); }}>Cancel</button>}{msg && <span class="muted">{msg}</span>}</div>
        </form>
      </section>
      <section class="card">{!rows ? <p class="muted">Loading…</p> : rows.length === 0 ? <p class="muted">No entries yet.</p> : (
        <table class="tbl"><thead><tr><th>Entry</th>{DATES.map(([, l]) => <th key={l}>{l}</th>)}<th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((ev) => (
            <tr key={ev.id}><td><b>{ev.title}</b><div class="muted small">{name(ev.exam_code)}</div></td>{DATES.map(([k]) => <td key={k} class="muted">{(ev[k] as string | null) ?? '—'}</td>)}
              <td><span class={`pill ${ev.status === 'published' ? 'live' : 'pending'}`}>{ev.status}</span></td>
              <td class="right"><button class="btn sm" onClick={() => edit(ev)}>Edit</button> <button class="btn sm" onClick={() => remove(ev)}>Delete</button></td></tr>
          ))}</tbody></table>
      )}</section>
    </>
  );
}
