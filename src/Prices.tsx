import { useEffect, useState } from 'preact/hooks';
import { api, rupees } from './api';

type P = { code: string; kind: 'pack' | 'plan'; title: string; blurb: string; default_paise: number; price_paise: number };

/** Prices of plans and paper packs (bundle prices are set on each bundle). Changes apply to new purchases at once. */
export function Prices() {
  const [rows, setRows] = useState<P[] | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => api<{ prices: P[] }>('/admin/prices').then((r) => { setRows(r.prices); setEdit(Object.fromEntries(r.prices.map((p) => [p.code, String(p.price_paise / 100)]))); });
  useEffect(() => { load(); }, []);
  async function save() {
    setMsg(null);
    const prices = Object.fromEntries(Object.entries(edit).map(([k, v]) => [k, Math.round(Number(v || 0) * 100)]));
    if (!confirm('Save these prices? New purchases use them straight away.')) return;
    try { await api('/admin/prices', { method: 'PUT', body: { prices } }); setMsg('Saved.'); load(); }
    catch (e: any) { setMsg(e.data?.message ?? e.message); }
  }
  return (
    <>
      <div class="titlebar"><h1>Prices</h1><span class="muted">Plans and paper packs. Bundle prices are on each bundle.</span></div>
      <section class="card">{!rows ? <p class="muted">Loading…</p> : (
        <>
          <table class="tbl"><thead><tr><th>Item</th><th>Default</th><th>Price (₹)</th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.code}><td><b>{p.title}</b> <span class="muted small">{p.kind}</span><div class="muted small">{p.blurb}</div></td><td class="muted">{rupees(p.default_paise)}</td>
                <td><input type="number" min={1} step="1" value={edit[p.code]} onInput={(e) => setEdit({ ...edit, [p.code]: (e.target as HTMLInputElement).value })} style="width:100px" />
                  {Math.round(Number(edit[p.code] || 0) * 100) !== p.default_paise && <button class="btn sm" style="margin-left:6px" onClick={() => setEdit({ ...edit, [p.code]: String(p.default_paise / 100) })}>Default</button>}</td></tr>
            ))}</tbody></table>
          <div class="row"><button class="btn primary" onClick={save}>Save prices</button>{msg && <span class="muted">{msg}</span>}</div>
          <p class="muted small">Descriptions like "₹20 per paper" don't update themselves; mention it if a price change makes one wrong.</p>
        </>
      )}</section>
    </>
  );
}
