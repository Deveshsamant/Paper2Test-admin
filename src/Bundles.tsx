import { useEffect, useRef, useState } from 'preact/hooks';
import { API, apiRaw, api, fromPaise, rupees, session, toPaise } from './api';

/** The website (for the upload window): same site as the API. */
const SITE = new URL(API).origin;
import { go } from './main';

export type Item = { id: string; paper_id: string; test_id: string; position: number; title: string | null; paper_title: string; code: string; duration_sec: number; marking_json: string; question_count: number; keyed_count: number ; is_free?: number; section_id?: string | null };
export type Section = { id: string; title: string; position: number };
export type BFile = { id: string; title: string; size: number; chunks: number; position: number; locked: number; status: string };
export type Bundle = { id: string; slug: string; title: string; description: string | null; exam: string | null; exam_tags?: string | null; language?: string | null; difficulty?: string | null; includes_json?: string | null; cover_updated?: number | null; files?: BFile[]; price_paise: number; original_price_paise: number | null; max_attempts_per_test: number | null; validity_days: number | null; status: string; sort_order: number; items: Item[]; sections?: Section[]; sales: number; revenue_paise: number; item_count?: number };
export type Paper = { id: string; title: string; question_count: number; keyed_count: number; owner?: string | null };
export const statusPill = (s: string) => `pill ${s === 'published' ? 'live' : s === 'archived' ? 'ended' : 'pending'}`;

type ExamCategory = { id: string; name: string; exams: { code: string; name: string }[] };

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
  const [add, setAdd] = useState({ paper_id: '', duration_min: '60', correct: '2', wrong: '0.66', show_result: true, section_id: '' });
  const [owner, setOwner] = useState(''); // papers from another account (email / @username)
  const [newSection, setNewSection] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false); // website's upload screen in a window
  const addRef = useRef(add); addRef.current = add;
  const [msg, setMsg] = useState<string | null>(null);
  const [cats, setCats] = useState<ExamCategory[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => { api<{ categories: ExamCategory[] }>('/exams').then((r) => setCats(r.categories)).catch(() => {}); }, []);
  const load = () => api<{ bundle: Bundle }>(`/admin/bundles/${id}`).then((r) => {
    try { setTags(JSON.parse(r.bundle.exam_tags ?? '[]')); } catch { setTags([]); }
    setB(r.bundle);
    let inc: string[] = []; try { inc = JSON.parse(r.bundle.includes_json ?? '[]'); } catch { /* keep empty */ }
    setF({ language: r.bundle.language ?? '', difficulty: r.bundle.difficulty ?? '', includes: inc.join('\n'), title: r.bundle.title, slug: r.bundle.slug, description: r.bundle.description ?? '', exam: r.bundle.exam ?? '', price: fromPaise(r.bundle.price_paise), original: fromPaise(r.bundle.original_price_paise), max_attempts: r.bundle.max_attempts_per_test ?? '', validity: r.bundle.validity_days ?? '', sort_order: r.bundle.sort_order });
  });
  const loadPapers = (who = '') => api<{ papers: Paper[] }>(`/admin/papers${who ? `?owner=${encodeURIComponent(who)}` : ''}`)
    .then((r) => { setPapers(r.papers); setAdd((a) => ({ ...a, paper_id: r.papers[0]?.id ?? '' })); if (who) setMsg(r.papers.length ? `${r.papers.length} ready papers from ${who}.` : `${who} has no ready papers.`); })
    .catch((e) => setMsg(e.code === 'user_not_found' ? 'No account with that email / username.' : e.message));
  useEffect(() => { load(); loadPapers(); }, [id]);
  // The upload window says when its paper is ready: add it to this bundle with the settings chosen in "Add a test".
  useEffect(() => {
    const onMsg = async (e: MessageEvent) => {
      if (e.origin !== SITE || e.data?.type !== 'p2t:paper-ready' || !e.data.paper_id) return;
      setUploadOpen(false);
      const a = addRef.current;
      try {
        await api(`/admin/bundles/${id}/items`, { method: 'POST', body: { paper_id: e.data.paper_id, duration_min: Number(a.duration_min), marking: { default: { correct: Number(a.correct), wrong: Number(a.wrong) } }, show_result: a.show_result, section_id: a.section_id || null } });
        setMsg(`Added "${e.data.title}" to the bundle (${e.data.questions} questions${e.data.keyed < e.data.questions ? `, answer key ${e.data.keyed}/${e.data.questions}` : ''}).`);
      } catch (err: any) { setMsg(err.code === 'already_in_bundle' ? 'That paper is already in this bundle.' : err.code === 'paper_not_ready' ? 'Mark the paper ready first (step 4 on its page).' : err.message); }
      await load(); loadPapers(owner.trim());
    };
    addEventListener('message', onMsg);
    return () => removeEventListener('message', onMsg);
  }, [id, owner]);
  const set = (k: string) => (e: Event) => setF({ ...f, [k]: (e.target as HTMLInputElement).value });

  async function save(status?: string) {
    setMsg(null);
    try {
      await api(`/admin/bundles/${id}`, { method: 'PUT', body: { title: f.title, slug: f.slug || undefined, description: f.description || null, exam: f.exam || null, exam_tags: tags, language: f.language || null, difficulty: f.difficulty || null, includes: String(f.includes ?? '').split('\n').map((x: string) => x.trim()).filter(Boolean).slice(0, 15), price_paise: toPaise(f.price), original_price_paise: f.original ? toPaise(f.original) : null, max_attempts_per_test: f.max_attempts ? Number(f.max_attempts) : null, validity_days: f.validity ? Number(f.validity) : null, sort_order: Number(f.sort_order || 0), ...(status ? { status } : {}) } });
      await load(); setMsg(status ? `Bundle ${status}.` : 'Saved.');
    } catch (e: any) { setMsg(e.code === 'slug_taken' ? 'That slug is taken.' : e.data?.issues?.[0]?.message ?? e.message); }
  }
  async function addItem(e: Event) {
    e.preventDefault(); setMsg(null);
    try { await api(`/admin/bundles/${id}/items`, { method: 'POST', body: { paper_id: add.paper_id, duration_min: Number(add.duration_min), marking: { default: { correct: Number(add.correct), wrong: Number(add.wrong) } }, show_result: add.show_result, section_id: add.section_id || null } }); await load(); setMsg('Test added.'); }
    catch (err: any) { setMsg(err.code === 'already_in_bundle' ? 'That paper is already in this bundle.' : err.code === 'paper_not_ready' ? 'That paper is not marked ready.' : err.message); }
  }
  async function updateItem(it: Item, patch: any) { await api(`/admin/bundles/${id}/items/${it.id}`, { method: 'PUT', body: patch }); await load(); }
  async function removeItem(it: Item) { if (!confirm(`Remove "${it.title ?? it.paper_title}" from the bundle?`)) return; await api(`/admin/bundles/${id}/items/${it.id}`, { method: 'DELETE' }); await load(); }
  async function addSection(e: Event) { e.preventDefault(); if (!newSection.trim()) return; await api(`/admin/bundles/${id}/sections`, { method: 'POST', body: { title: newSection.trim() } }); setNewSection(''); await load(); }
  async function updateSection(s: Section, patch: { title?: string; move?: 'up' | 'down' }) { await api(`/admin/bundles/${id}/sections/${s.id}`, { method: 'PUT', body: patch }); await load(); }
  async function removeSection(s: Section) { if (!confirm(`Delete the section "${s.title}"? Its tests stay in the bundle, outside any section.`)) return; await api(`/admin/bundles/${id}/sections/${s.id}`, { method: 'DELETE' }); await load(); }
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
          <div class="field"><span>Exam tags — students who chose these exams see this bundle first{!tags.length && ' (none: guessed from the exam and title)'}</span>
            <div class="chips">{cats.flatMap((c) => c.exams).map((e) => (
              <button type="button" key={e.code} class={`chip ${tags.includes(e.code) ? 'on' : ''}`} onClick={() => setTags(tags.includes(e.code) ? tags.filter((t) => t !== e.code) : [...tags, e.code])}>{e.name}</button>
            ))}</div>
          </div>
          <label class="field">Description<textarea rows={4} value={f.description} onInput={set('description')} /></label>
          <label class="field">What's included (one per line)<textarea rows={4} value={f.includes} onInput={set('includes')} placeholder={'20 full-length mock tests\nExplanations for every question\nPrevious year papers 2018-2024'} /></label>
          <div class="grid3">
            <label class="field">Language<select value={f.language} onChange={set('language')}><option value="">—</option><option value="en">English</option><option value="hi">Hindi</option><option value="both">Hindi + English</option></select></label>
            <label class="field">Difficulty<select value={f.difficulty} onChange={set('difficulty')}><option value="">—</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="mixed">Mixed</option></select></label>
          </div>
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
          <p class="muted small">Pick a ready paper, or upload a new one - PDF, page photos or pasted questions, the same way users do. Duration, marking and section below are used for the new test.</p>
          <button type="button" class="btn primary" style="margin:0 0 12px" onClick={() => setUploadOpen(true)}>Upload a new paper (PDF / photos)</button>
          <form class="row wrap" onSubmit={(e) => { e.preventDefault(); loadPapers(owner.trim()); }} style="margin:0 0 6px">
            <input value={owner} onInput={(e) => setOwner((e.target as HTMLInputElement).value)} placeholder="Papers from another account: email or @username" />
            <button class="btn sm">Show</button>{owner && <button type="button" class="btn sm" onClick={() => { setOwner(''); loadPapers(); }}>Admin accounts</button>}
          </form>
          <form onSubmit={addItem}>
            <label class="field">Paper<select value={add.paper_id} onChange={(e) => setAdd({ ...add, paper_id: (e.target as HTMLSelectElement).value })}>{!papers.length && <option value="">No ready papers</option>}{papers.map((p) => <option value={p.id} disabled={inBundle.has(p.id)}>{p.title} ({p.question_count} Qs{p.keyed_count < p.question_count ? `, key ${p.keyed_count}/${p.question_count}` : ''}){p.owner ? ` · ${p.owner}` : ''}{inBundle.has(p.id) ? ' · already added' : ''}</option>)}</select></label>
            {!!b.sections?.length && <label class="field">Section<select value={add.section_id} onChange={(e) => setAdd({ ...add, section_id: (e.target as HTMLSelectElement).value })}><option value="">No section</option>{b.sections.map((s) => <option value={s.id}>{s.title}</option>)}</select></label>}
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
        <h2>Sections <span class="muted small">(optional)</span></h2>
        <p class="muted small">Group the tests, e.g. by year ("2024", "2023") or subject ("English", "Maths", "GK"). Students see the tests under these headings. Tests without a section are shown first.</p>
        {!!b.sections?.length && (
          <table class="tbl"><tbody>{b.sections.map((s, k) => (
            <tr key={s.id}>
              <td><input value={s.title} maxLength={80} onChange={(e) => { const v = (e.target as HTMLInputElement).value.trim(); if (v && v !== s.title) updateSection(s, { title: v }); }} /></td>
              <td class="muted small">{b.items.filter((it) => it.section_id === s.id).length} tests</td>
              <td class="right"><button class="btn sm" disabled={k === 0} onClick={() => updateSection(s, { move: 'up' })}>↑</button> <button class="btn sm" disabled={k === b.sections!.length - 1} onClick={() => updateSection(s, { move: 'down' })}>↓</button> <button class="btn sm" onClick={() => removeSection(s)}>Delete</button></td>
            </tr>
          ))}</tbody></table>
        )}
        <form class="row" onSubmit={addSection} style="margin-top:10px"><input value={newSection} maxLength={80} onInput={(e) => setNewSection((e.target as HTMLInputElement).value)} placeholder="New section, e.g. 2024 or English" /><button class="btn" disabled={!newSection.trim()}>Add section</button></form>
      </section>
      <section class="card">
        <h2>Tests in this bundle ({b.items.length})</h2>
        <p class="muted small"># sets the order. "Free sample" lets anyone signed in take that test before buying.</p>
        {b.items.length === 0 ? <p class="muted">Add at least one test before publishing.</p> : (
          <table class="tbl"><thead><tr><th>#</th><th>Title</th>{!!b.sections?.length && <th>Section</th>}<th>Questions</th><th>Key</th><th>Duration</th><th>Free sample</th><th>Code</th><th></th></tr></thead>
            <tbody>{b.items.map((it) => (
              <tr key={it.id}>
                <td><input type="number" value={it.position} style="width:60px" onChange={(e) => updateItem(it, { position: Number((e.target as HTMLInputElement).value) })} /></td>
                <td><input value={it.title ?? it.paper_title} onChange={(e) => updateItem(it, { title: (e.target as HTMLInputElement).value })} /></td>
                {!!b.sections?.length && <td><select value={it.section_id ?? ''} onChange={(e) => updateItem(it, { section_id: (e.target as HTMLSelectElement).value || null })}><option value="">—</option>{b.sections.map((s) => <option value={s.id}>{s.title}</option>)}</select></td>}
                <td>{it.question_count}</td><td>{it.keyed_count}/{it.question_count}</td>
                <td><input type="number" min={1} value={it.duration_sec / 60} style="width:70px" onChange={(e) => updateItem(it, { duration_min: Number((e.target as HTMLInputElement).value) })} /> min</td>
                <td><input type="checkbox" checked={!!it.is_free} onChange={(e) => updateItem(it, { is_free: (e.target as HTMLInputElement).checked })} /></td>
                <td><code>{it.code}</code></td>
                <td class="right"><button class="btn sm" onClick={() => removeItem(it)}>Remove</button></td>
              </tr>
            ))}</tbody></table>
        )}
      </section>
      {uploadOpen && (
        <div class="modal" onClick={() => { setUploadOpen(false); loadPapers(owner.trim()); }}>
          <div class="card sheet uploadsheet" onClick={(e) => e.stopPropagation()}>
            <div class="row between"><h2 style="margin:0">Upload a paper for "{b.title}"</h2><button class="btn sm" onClick={() => { setUploadOpen(false); loadPapers(owner.trim()); }}>Close</button></div>
            <p class="muted small">Create the paper, upload it, check the questions and answer key, then press <b>Add to bundle</b> at the top of the paper. Uses your admin account; no plan limits.</p>
            <iframe name="p2t-embed" title="Upload a paper" src={`${SITE}/?tok=${encodeURIComponent(session.token ?? '')}#/papers`} style="width:100%;height:78vh;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc" />
          </div>
        </div>
      )}
      <CoverCard b={b} onChanged={load} />
      <FilesCard b={b} onChanged={load} />
    </>
  );
}

/** Cover image: cropped to 1200x630 (the size link previews use) and uploaded as a small JPEG. */
function CoverCard({ b, onChanged }: { b: Bundle; onChanged: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  async function upload(file: File | undefined) {
    if (!file) return;
    setMsg('Uploading…');
    try {
      const bmp = await createImageBitmap(file);
      const W = 1200, H = 630, r = Math.max(W / bmp.width, H / bmp.height);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d')!.drawImage(bmp, (W - bmp.width * r) / 2, (H - bmp.height * r) / 2, bmp.width * r, bmp.height * r);
      const blob: Blob = await new Promise((res) => c.toBlob((x) => res(x!), 'image/jpeg', 0.82));
      await apiRaw(`/admin/bundles/${b.id}/cover`, 'PUT', blob, 'image/jpeg');
      setMsg('Cover updated.'); onChanged();
    } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section class="card">
      <h2>Cover image</h2>
      {b.cover_updated ? <img src={`${API.replace(/\/api$/, '')}/api/store/cover/${b.id}/${b.cover_updated}.jpg`} alt="" style="max-width:100%;width:480px;border-radius:8px;display:block;margin-bottom:8px" /> : <p class="muted small">No cover yet. Wide pictures work best (it is cropped to 1200×630).</p>}
      <div class="row wrap"><label class="btn file">Choose picture<input type="file" accept="image/*" onChange={(e) => upload((e.target as HTMLInputElement).files?.[0])} /></label>
        {!!b.cover_updated && <button class="btn sm" onClick={async () => { await api(`/admin/bundles/${b.id}/cover`, { method: 'DELETE' }); onChanged(); }}>Remove</button>}{msg && <span class="muted">{msg}</span>}</div>
    </section>
  );
}

/** Study material PDFs: uploaded in 1.5 MB pieces; "read only" hides the download button. */
function FilesCard({ b, onChanged }: { b: Bundle; onChanged: () => void }) {
  const [title, setTitle] = useState('');
  const [locked, setLocked] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function upload(e: Event) {
    e.preventDefault();
    if (!file) return;
    if (file.type !== 'application/pdf') { setMsg('Choose a PDF file.'); return; }
    if (file.size > 30_000_000) { setMsg('Up to 30 MB per PDF.'); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ id: string; chunk_size: number; chunks: number }>(`/admin/bundles/${b.id}/files`, { method: 'POST', body: { title: title.trim() || file.name.replace(/\.pdf$/i, ''), size: file.size, mime: 'application/pdf', locked } });
      for (let n = 0; n < r.chunks; n++) {
        setMsg(`Uploading… ${Math.round((n / r.chunks) * 100)}%`);
        await apiRaw(`/admin/files/${r.id}/chunks/${n}`, 'PUT', await file.slice(n * r.chunk_size, (n + 1) * r.chunk_size).arrayBuffer(), 'application/octet-stream');
      }
      await api(`/admin/files/${r.id}/complete`, { method: 'POST', body: {} });
      setMsg('Uploaded.'); setTitle(''); setFile(null); onChanged();
    } catch (err: any) { setMsg(err.message); }
    finally { setBusy(false); }
  }
  const files = b.files ?? [];
  return (
    <section class="card form">
      <h2>Study material ({files.length})</h2>
      <p class="muted small">PDFs that owners can read in the app and on the website (up to 30 MB each).</p>
      {files.length > 0 && (
        <table class="tbl"><thead><tr><th>#</th><th>Title</th><th>Size</th><th>Read only</th><th></th></tr></thead>
          <tbody>{files.map((f) => (
            <tr key={f.id}>
              <td><input type="number" value={f.position} style="width:60px" onChange={async (e) => { await api(`/admin/files/${f.id}`, { method: 'PUT', body: { position: Number((e.target as HTMLInputElement).value) } }); onChanged(); }} /></td>
              <td><input value={f.title} onChange={async (e) => { await api(`/admin/files/${f.id}`, { method: 'PUT', body: { title: (e.target as HTMLInputElement).value } }); onChanged(); }} />{f.status !== 'ready' && <span class="err small"> upload not finished</span>}</td>
              <td class="muted">{(f.size / 1_000_000).toFixed(1)} MB</td>
              <td><input type="checkbox" checked={!!f.locked} onChange={async (e) => { await api(`/admin/files/${f.id}`, { method: 'PUT', body: { locked: (e.target as HTMLInputElement).checked } }); onChanged(); }} /></td>
              <td class="right"><button class="btn sm" onClick={async () => { if (!confirm(`Delete "${f.title}"?`)) return; await api(`/admin/files/${f.id}`, { method: 'DELETE' }); onChanged(); }}>Delete</button></td>
            </tr>
          ))}</tbody></table>
      )}
      <form onSubmit={upload}>
        <div class="grid3">
          <label class="field">PDF<input type="file" accept="application/pdf" onChange={(e) => setFile((e.target as HTMLInputElement).files?.[0] ?? null)} /></label>
          <label class="field">Title<input value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder={file?.name.replace(/\.pdf$/i, '') ?? 'e.g. Polity short notes'} /></label>
          <label class="chk" style="align-self:end"><input type="checkbox" checked={locked} onChange={(e) => setLocked((e.target as HTMLInputElement).checked)} /> read only (no download)</label>
        </div>
        <div class="row"><button class="btn primary" disabled={!file || busy}>{busy ? 'Uploading…' : 'Upload'}</button>{msg && <span class="muted">{msg}</span>}</div>
      </form>
    </section>
  );
}
