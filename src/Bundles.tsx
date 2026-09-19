import { useEffect, useState } from 'preact/hooks';
import { api, fromPaise, rupees, toPaise } from './api';
import { go } from './main';

export type Item = { id: string; paper_id: string; test_id: string; position: number; title: string | null; paper_title: string; code: string; duration_sec: number; marking_json: string; question_count: number; keyed_count: number };
export type Bundle = { id: string; slug: string; title: string; description: string | null; exam: string | null; price_paise: number; original_price_paise: number | null; max_attempts_per_test: number | null; validity_days: number | null; status: string; sort_order: number; items: Item[]; sales: number; revenue_paise: number; item_count?: number };
export type Paper = { id: string; title: string; question_count: number; keyed_count: number };
export const statusPill = (s: string) => `pill ${s === 'published' ? 'live' : s === 'archived' ? 'ended' : 'pending'}`;

export function Bundles() {
  const [rows, setRows] = useState<Bundle[] | null>(null);
  const [title, setTitle] = useState('');
  useEffect(() => { api<{ bundles: Bundle[] }>('/admin/bundles').then((r) => setRows(r.bundles)); }, []);
  async function create(e: Event) { e.preventDefault(); const r = await api<{ bundle: Bundle }>('/admin/bundles', { method: 'POST', body: { title: title.trim(), price_paise: 0 } }); go(`/bundles/${r.bundle.id}`); }
  return (
    <>
      <div class="titlebar"><h1>Bundles</h1></div>
      <section class="card"><form class="row" onSubmit={create}><input value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="New bundle title, e.g. UPSC Prelims PYQ 2015-2025" required /><button class="btn primary">Create</button></form></section>
      <section class="card">{!rows ? <p class="muted">Loading…</p> : rows.length === 0 ? <p class="muted">No bundles yet.</p> : (
        <table class="tbl"><thead><tr><th>Title</th><th>Price</th><th>Tests</th><th>Attempts/test</th><th>Validity</th><th>Sales</th><th>Revenue</th><th>Status</th></tr></thead>
          <tbody>{rows.map((b) => <tr key={b.id}><td><a href={`#/bundles/${b.id}`}>{b.title}</a><div class="muted small">/{b.slug}{b.exam ? ` · ${b.exam}` : ''}</div></td><td>{rupees(b.price_paise)}{b.original_price_paise ? <s class="muted small"> {rupees(b.original_price_paise)}</s> : null}</td><td>{b.item_count ?? 0}</td><td>{b.max_attempts_per_test ?? '∞'}</td><td>{b.validity_days ? `${b.validity_days} d` : 'lifetime'}</td><td>{b.sales}</td><td>{rupees(b.revenue_paise)}</td><td><span class={statusPill(b.status)}>{b.status}</span></td></tr>)}</tbody></table>
      )}</section>
    </>
  );
}

export function BundleEdit({ id }: { id: string }) {
  const [b, setB] = useState<Bundle | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [f, setF] = useState<any>(null);
  const [add, setAdd] = useState({ paper_id: '', duration_min: '60', correct: '2', wrong: '0.66', show_result: true });
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => api<{ bundle: Bundle }>(`/admin/bundles/${id}`).then((r) => {
    setB(r.bundle);
    setF({ title: r.bundle.title, slug: r.bundle.slug, description: r.bundle.description ?? '', exam: r.bundle.exam ?? '', price: fromPaise(r.bundle.price_paise), original: fromPaise(r.bundle.original_price_paise), max_attempts: r.bundle.max_attempts_per_test ?? '', validity: r.bundle.validity_days ?? '', sort_order: r.bundle.sort_order });
  });
  useEffect(() => { load(); api<{ papers: Paper[] }>('/admin/papers').then((r) => { setPapers(r.papers); if (r.papers[0]) setAdd((a) => ({ ...a, paper_id: r.papers[0].id })); }); }, [id]);
  const set = (k: string) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });

  async function save(status?: string) {
    setMsg(null);
    try {
      await api(`/admin/bundles/${id}`, { method: 'PUT', body: { title: f.title, slug: f.slug || undefined, description: f.description || null, exam: f.exam || null, price_paise: toPaise(f.price), original_price_paise: f.original ? toPaise(f.original) : null, max_attempts_per_test: f.max_attempts ? Number(f.max_attempts) : null, validity_days: f.validity ? Number(f.validity) : null, sort_order: Number(f.sort_order || 0), ...(status ? { status } : {}) } });
      await load(); setMsg(status ? `Bundle ${status}.` : 'Saved.');
    } catch (e: any) { setMsg(e.code === 'slug_taken' ? 'That slug is taken.' : e.data?.issues?.[0]?.message ?? e.message); }
  }
  async function addItem(e: Event) {
    e.preventDefault(); setMsg(null);
    try { await api(`/admin/bundles/${id}/items`, { method: 'POST', body: { paper_id: add.paper_id, duration_min: Number(add.duration_min), marking: { default: { correct: Number(add.correct), wrong: Number(add.wrong) } }, show_result: add.show_result } }); await load(); }
    catch (err: any) { setMsg(err.code === 'already_in_bundle' ? 'That paper is already in this bundle.' : err.code === 'paper_not_ready' ? 'That paper is not marked ready.' : err.message); }
  }
  async function updateItem(it: Item, patch: any) { await api(`/admin/bundles/${id}/items/${it.id}`, { method: 'PUT', body: patch }); await load(); }
  async function removeItem(it: Item) { if (!confirm(`Remove "${it.title ?? it.paper_title}" from the bundle?`)) return; await api(`/admin/bundles/${id}/items/${it.id}`, { method: 'DELETE' }); await load(); }
  async function del() { if (!confirm('Delete this bundle? (It is archived instead if it has sales.)')) return; await api(`/admin/bundles/${id}`, { method: 'DELETE' }); go('/bundles'); }

  if (!b || !f) return <p class="muted">Loading…</p>;
  const inBundle = new Set(b.items.map((i) => i.paper_id));
  return (
    <>
      <div class="titlebar"><h1>{b.title}</h1><span class={statusPill(b.status)}>{b.status}</span><span class="muted">{b.sales} sales · {rupees(b.revenue_paise)}</span><span class="spacer" /><a class="btn sm" href={`https://paper2test.app/#/store/${b.slug}`} target="_blank">View in store</a><a class="btn sm" href="#/bundles">← Bundles</a></div>
      <div class="grid2">
        <section class="card form">
          <h2>Details &amp; pricing</h2>
          <label class="field">Title<input value={f.title} onInput={set('title')} /></label>
          <label class="field">Slug (URL)<input value={f.slug} onInput={set('slug')} /></label>
          <label class="field">Exam<input value={f.exam} onInput={set('exam')} placeholder="e.g. UPSC CSE Prelims" /></label>
          <label class="field">Description<textarea rows={4} value={f.description} onInput={set('description')} /></label>
          <div class="grid3">
            <label class="field">Price (₹)<input type="number" min={0} step="1" value={f.price} onInput={set('price')} /></label>
            <label class="field">Original price (₹)<input type="number" min={0} step="1" value={f.original} onInput={set('original')} placeholder="strike-through" /></label>
            <label class="field">Sort order<input type="number" value={f.sort_order} onInput={set('sort_order')} /></label>
            <label class="field">Attempts per test<input type="number" min={1} value={f.max_attempts} onInput={set('max_attempts')} placeholder="unlimited" /></label>
            <label class="field">Validity (days)<input type="number" min={1} value={f.validity} onInput={set('validity')} placeholder="lifetime" /></label>
          </div>
          <div class="row wrap"><button class="btn primary" onClick={() => save()}>Save</button>{b.status !== 'published' ? <button class="btn" onClick={() => save('published')} disabled={!b.items.length}>Publish</button> : <button class="btn" onClick={() => save('draft')}>Unpublish</button>}<button class="btn danger sm" onClick={del}>Delete</button>{msg && <span class="muted">{msg}</span>}</div>
        </section>
        <section class="card form">
          <h2>Add a test</h2>
          <p class="muted small">Ready papers from your admin account. Upload new ones on paper2test.app.</p>
          <form onSubmit={addItem}>
            <label class="field">Paper<select value={add.paper_id} onChange={(e) => setAdd({ ...add, paper_id: (e.target as HTMLSelectElement).value })}>{papers.map((p) => <option value={p.id} disabled={inBundle.has(p.id)}>{p.title} ({p.question_count} Qs{p.keyed_count < p.question_count ? `, key ${p.keyed_count}/${p.question_count}` : ''})</option>)}</select></label>
            <div class="grid3">
              <label class="field">Duration (min)<input type="number" min={1} value={add.duration_min} onInput={(e) => setAdd({ ...add, duration_min: (e.target as HTMLInputElement).value })} /></label>
              <label class="field">+ per correct<input type="number" step="0.01" value={add.correct} onInput={(e) => setAdd({ ...add, correct: (e.target as HTMLInputElement).value })} /></label>
              <label class="field">- per wrong<input type="number" step="0.01" value={add.wrong} onInput={(e) => setAdd({ ...add, wrong: (e.target as HTMLInputElement).value })} /></label>
            </div>
            <label class="chk"><input type="checkbox" checked={add.show_result} onChange={(e) => setAdd({ ...add, show_result: (e.target as HTMLInputElement).checked })} /> show score to the student after submitting</label>
            <div class="row" style="margin-top:8px"><button class="btn primary" disabled={!add.paper_id || !papers.length}>Add to bundle</button></div>
          </form>
        </section>
      </div>
      <section class="card">
        <h2>Tests in this bundle ({b.items.length})</h2>
        {b.items.length === 0 ? <p class="muted">Add at least one test before publishing.</p> : (
          <table class="tbl"><thead><tr><th>#</th><th>Title</th><th>Questions</th><th>Key</th><th>Duration</th><th>Code</th><th></th></tr></thead>
            <tbody>{b.items.map((it) => (
              <tr key={it.id}>
                <td><input type="number" value={it.position} style="width:60px" onChange={(e) => updateItem(it, { position: Number((e.target as HTMLInputElement).value) })} /></td>
                <td><input value={it.title ?? it.paper_title} onChange={(e) => updateItem(it, { title: (e.target as HTMLInputElement).value })} /></td>
                <td>{it.question_count}</td><td>{it.keyed_count}/{it.question_count}</td>
                <td><input type="number" min={1} value={it.duration_sec / 60} style="width:70px" onChange={(e) => updateItem(it, { duration_min: Number((e.target as HTMLInputElement).value) })} /> min</td>
                <td><code>{it.code}</code></td>
                <td class="right"><button class="btn sm" onClick={() => removeItem(it)}>Remove</button></td>
              </tr>
            ))}</tbody></table>
        )}
      </section>
    </>
  );
}
