import { useEffect, useState } from 'preact/hooks';
import { api, fmtDate } from './api';

type Top = { id: string; email: string | null; username: string | null; name: string | null; ref_code: string | null; counted: number; waiting: number; revoked: number; spent: number; last_at: number };
type Recent = { referred_id: string; status: string; created_at: number; credited_at: number | null; friend_email: string | null; friend_name: string | null; inviter_email: string | null; inviter_name: string | null };

/** Referrals (#33): who invites the most, and the latest friends who joined. A referral from a fake account can be
 *  taken back (it stops counting; credits already spent stay spent). */
export function Referrals() {
  const [d, setD] = useState<{ top: Top[]; recent: Recent[] } | null>(null);
  const load = () => api<{ top: Top[]; recent: Recent[] }>('/admin/referrals').then(setD);
  useEffect(() => { load(); }, []);
  async function revoke(r: Recent) {
    if (!confirm(`Stop counting ${r.friend_email ?? r.friend_name} for ${r.inviter_email ?? r.inviter_name}?`)) return;
    await api(`/admin/referrals/${r.referred_id}/revoke`, { method: 'POST', body: {} }); load();
  }
  return (
    <>
      <div class="titlebar"><h1>Referrals</h1></div>
      <p class="muted">1 friend who signs up with an invite link and writes a test = 1 credit. 5 credits = Student plan, 10 = any bundle. At most 30 count per inviter per 30 days. Rewards show as "referral" in Purchases and are left out of sales.</p>
      {!d ? <p class="muted">Loading…</p> : (
        <>
          <section class="card"><h2>Top inviters</h2>
            {!d.top.length ? <p class="muted">No referrals yet.</p> : (
              <table class="tbl"><thead><tr><th>Inviter</th><th>Code</th><th>Counted</th><th>Waiting</th><th>Taken back</th><th>Credits used</th><th>Last friend</th></tr></thead>
                <tbody>{d.top.map((t) => <tr key={t.id}><td>{t.name}<div class="muted small">{t.email}{t.username ? ` · @${t.username}` : ''}</div></td><td><code>{t.ref_code}</code></td><td><b>{t.counted}</b></td><td>{t.waiting}</td><td>{t.revoked}</td><td>{t.spent}</td><td class="muted">{fmtDate(t.last_at)}</td></tr>)}</tbody></table>
            )}
          </section>
          <section class="card"><h2>Latest friends</h2>
            {!d.recent.length ? <p class="muted">Nobody yet.</p> : (
              <table class="tbl"><thead><tr><th>Joined</th><th>Friend</th><th>Invited by</th><th>Status</th><th /></tr></thead>
                <tbody>{d.recent.map((r) => <tr key={r.referred_id}><td class="muted">{fmtDate(r.created_at)}</td><td>{r.friend_name}<div class="muted small">{r.friend_email}</div></td><td>{r.inviter_name}<div class="muted small">{r.inviter_email}</div></td>
                  <td><span class={`pill ${r.status === 'credited' ? 'live' : r.status === 'pending' ? 'pending' : 'ended'}`}>{r.status === 'credited' ? 'counted' : r.status === 'pending' ? 'waiting for a test' : 'taken back'}</span></td>
                  <td>{r.status !== 'revoked' && <button class="btn sm" onClick={() => revoke(r)}>Take back</button>}</td></tr>)}</tbody></table>
            )}
          </section>
        </>
      )}
    </>
  );
}
