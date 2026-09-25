import { useEffect, useState } from 'preact/hooks';
import { api, rupees } from './api';

type P = { code: string; kind: 'pack' | 'plan'; title: string; blurb: string; default_paise: number; price_paise: number; original_paise?: number | null };
const pct = (price: number, was: number) => (was > price && price > 0 ? Math.round((1 - price / was) * 100) : 0);
type PlayInfo = { configured: boolean; prices?: Record<string, { paise: number | null; state: string }>; error?: string };

const STATE: Record<string, [string, string]> = { ACTIVE: ['On sale', 'live'], DRAFT: ['Draft', 'pending'], INACTIVE: ['Off', 'ended'], INACTIVE_PUBLISHED: ['Off', 'ended'], MISSING: ['Not created', ''] };
const GOOGLE_FEE = 0.15; // Google Play keeps 15% (first $1M a year, and all subscriptions)

/** Prices of plans and paper packs: website (Razorpay) and Android app (Google Play). Bundle prices are on each bundle. */
export function Prices() {
  const [rows, setRows] = useState<P[] | null>(null);
  const [play, setPlay] = useState<PlayInfo | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [playEdit, setPlayEdit] = useState<Record<string, string>>({});
  const [orig, setOrig] = useState<Record<string, string>>({}); // "was" price, shown struck through
  const [msg, setMsg] = useState<string | null>(null);
  const [playMsg, setPlayMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api<{ prices: P[]; play: PlayInfo }>('/admin/prices').then((r) => {
    setRows(r.prices); setPlay(r.play);
    setEdit(Object.fromEntries(r.prices.map((p) => [p.code, String(p.price_paise / 100)])));
    setOrig(Object.fromEntries(r.prices.map((p) => [p.code, p.original_paise ? String(p.original_paise / 100) : ''])));
    setPlayEdit(Object.fromEntries(r.prices.map((p) => { const g = r.play.prices?.[p.code]?.paise; return [p.code, g != null ? String(g / 100) : String(p.price_paise / 100)]; })));
  });
  useEffect(() => { load(); }, []);
  async function save() {
    setMsg(null);
    const prices = Object.fromEntries(Object.entries(edit).map(([k, v]) => [k, Math.round(Number(v || 0) * 100)]));
    const originals = Object.fromEntries(Object.entries(orig).map(([k, v]) => [k, Math.round(Number(v || 0) * 100)]));
    if (!confirm('Save these website prices? New purchases use them straight away.')) return;
    try { await api('/admin/prices', { method: 'PUT', body: { prices, originals } }); setMsg('Saved.'); load(); }
    catch (e: any) { setMsg(e.data?.message ?? e.message); }
  }
  async function savePlay() {
    setPlayMsg(null);
    const prices = Object.fromEntries(Object.entries(playEdit).map(([k, v]) => [k, Math.round(Number(v || 0) * 100)]));
    if (!confirm('Send these prices to Google Play? Products that do not exist there yet are created and put on sale. Existing subscribers keep their current price.')) return;
    setBusy(true);
    try {
      const r = await api<{ results: Record<string, string> }>('/admin/prices/play', { method: 'PUT', body: { prices } });
      const bad = Object.entries(r.results).filter(([, v]) => v !== 'ok');
      setPlayMsg(bad.length ? `Some failed: ${bad.map(([k, v]) => `${k}: ${v}`).join(' · ')}` : 'Google Play updated. The app shows new prices within a few minutes.');
      load();
    } catch (e: any) { setPlayMsg(e.data?.message ?? e.message); }
    finally { setBusy(false); }
  }
  const same = () => setPlayEdit({ ...edit });
  return (
    <>
      <div class="titlebar"><h1>Prices</h1><span class="muted">Plans and paper packs. Bundle prices are on each bundle.</span></div>
      <section class="card">{!rows ? <p class="muted">Loading…</p> : (
        <>
          <table class="tbl"><thead><tr><th>Item</th><th>Original (₹)<div class="muted small" style="text-transform:none">shown struck through</div></th><th>Website (₹)<div class="muted small" style="text-transform:none">Razorpay</div></th><th>Android app (₹)<div class="muted small" style="text-transform:none">Google Play</div></th></tr></thead>
            <tbody>{rows.map((p) => {
              const g = play?.prices?.[p.code];
              const st = STATE[g?.state ?? 'MISSING'] ?? [g?.state ?? '', ''];
              const playPaise = Math.round(Number(playEdit[p.code] || 0) * 100);
              return (
                <tr key={p.code}><td><b>{p.title}</b> <span class="muted small">{p.kind}</span><div class="muted small">{p.blurb}</div></td>
                  <td><input type="number" min={0} step="1" value={orig[p.code] ?? ''} placeholder="none" onInput={(e) => setOrig({ ...orig, [p.code]: (e.target as HTMLInputElement).value })} style="width:100px" />
                    {(() => { const d = pct(Math.round(Number(edit[p.code] || 0) * 100), Math.round(Number(orig[p.code] || 0) * 100)); return d ? <div><span class="pill live">{d}% off</span></div> : orig[p.code] ? <div class="muted small">must be above the price</div> : null; })()}</td>
                  <td><input type="number" min={1} step="1" value={edit[p.code]} onInput={(e) => setEdit({ ...edit, [p.code]: (e.target as HTMLInputElement).value })} style="width:100px" />
                    {Math.round(Number(edit[p.code] || 0) * 100) !== p.default_paise && <button class="btn sm" style="margin-left:6px" onClick={() => setEdit({ ...edit, [p.code]: String(p.default_paise / 100) })}>Default</button>}
                    <div class="muted small">you get ≈ {rupees(Math.round(Number(edit[p.code] || 0) * 100 * (1 - 0.0236)))}</div></td>
                  <td>{play?.configured ? <>
                      <input type="number" min={10} step="1" value={playEdit[p.code]} onInput={(e) => setPlayEdit({ ...playEdit, [p.code]: (e.target as HTMLInputElement).value })} style="width:100px" /> <span class={`pill ${st[1]}`}>{st[0]}</span>
                      <div class="muted small">{g?.paise != null ? `now ${rupees(g.paise)} on Play · ` : ''}you get ≈ {rupees(Math.round(playPaise * (1 - GOOGLE_FEE)))}</div></>
                    : <span class="muted small">not connected</span>}</td></tr>
              );
            })}</tbody></table>
          <div class="row wrap" style="margin-top:12px"><button class="btn primary" onClick={save}>Save website prices</button>{msg && <span class="muted">{msg}</span>}</div>
          {play?.configured && (
            <div class="row wrap" style="margin-top:10px">
              <button class="btn primary" disabled={busy} onClick={savePlay}>{busy ? 'Sending to Google Play…' : 'Save Google Play prices'}</button>
              <button class="btn" disabled={busy} onClick={same}>Same as website</button>
              {playMsg && <span class={playMsg.startsWith('Some') ? 'err' : 'muted'}>{playMsg}</span>}
            </div>
          )}
          {play?.error && <p class="err small">Could not read Google Play: {play.error}</p>}
          <p class="muted small">Descriptions like "₹20 per paper" don't update themselves; mention it if a price change makes one wrong. Google keeps 15% of app sales, Razorpay about 2.4% of website sales.</p>
        </>
      )}</section>
      {play && !play.configured && (
        <section class="card">
          <h2>Connect Google Play (one time)</h2>
          <p class="muted small">The Android app sells plans and packs through Google Play Billing. To manage those prices here and to check app purchases, the server needs a Google Play service account key:</p>
          <ol class="small">
            <li>Google Cloud console → IAM &amp; Admin → Service accounts → Create (name: <code>play-billing</code>) → Keys → Add key → JSON.</li>
            <li>Play Console → Users and permissions → Invite new user → paste the service account's email → App permissions: Paper2Test → allow <b>View financial data</b>, <b>Manage orders and subscriptions</b> and <b>Manage store presence</b>.</li>
            <li>On the PC, in the server folder: <code>npx wrangler secret put PLAY_SERVICE_ACCOUNT &lt; key.json</code>, then delete key.json.</li>
          </ol>
          <p class="muted small">Google Play only accepts products after an app version that uses Play Billing has been uploaded to a testing track.</p>
        </section>
      )}
    </>
  );
}
