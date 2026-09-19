import { useEffect, useState } from 'preact/hooks';
import { api, fmtDate } from './api';

type Admins = { env_admins: string[]; admins: { email: string; created_at: number; signed_in: boolean }[] };
type U = { id: string; email: string | null; name: string | null; display_name: string | null; username: string | null; plan: string; plan_expires_at?: number | null; paper_credits?: number; role: string; created_at: number; tests_taken: number; tests_hosted: number; purchases: number };
const SKUS = ['pack_1', 'pack_5', 'teacher_m', 'teacher_y', 'coaching_m', 'coaching_y'];
export function Users() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<U[] | null>(null);
  const load = (query = '') => api<{ users: U[] }>(`/admin/users?q=${encodeURIComponent(query)}`).then((r) => setUsers(r.users));
  useEffect(() => { load(); }, []);
  const [admins, setAdmins] = useState<Admins | null>(null);
  const [newAdmin, setNewAdmin] = useState('');
  const [amsg, setAmsg] = useState<string | null>(null);
  const loadAdmins = () => api<Admins>('/admin/admins').then(setAdmins);
  useEffect(() => { loadAdmins(); }, []);
  async function addAdmin(e: Event) {
    e.preventDefault(); setAmsg(null);
    try { await api('/admin/admins', { method: 'POST', body: { email: newAdmin.trim() } }); setNewAdmin(''); setAmsg('Added. They get admin access at their next sign-in.'); loadAdmins(); load(q); }
    catch (err: any) { setAmsg(err.data?.message ?? err.message); }
  }
  async function removeAdmin(email: string) {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    try { await api(`/admin/admins/${encodeURIComponent(email)}`, { method: 'DELETE' }); loadAdmins(); load(q); }
    catch (err: any) { setAmsg(err.code === 'protected' ? 'That account is an owner (set in server config).' : err.code === 'cannot_remove_self' ? 'You cannot remove yourself.' : err.message); }
  }
  const [grantUser, setGrantUser] = useState(''); const [grantCode, setGrantCode] = useState('teacher_m'); const [gmsg, setGmsg] = useState<string | null>(null);
  async function grantPlan(e: Event) {
    e.preventDefault(); setGmsg(null);
    try { await api('/admin/users/grant', { method: 'POST', body: { user: grantUser.trim(), code: grantCode } }); setGmsg('Granted.'); load(q); }
    catch (err: any) { setGmsg(err.code === 'user_not_found' ? 'No such user (they must have signed in once).' : err.message); }
  }
  return (
    <>
      <section class="card">
        <h2>Grant a plan or pack</h2>
        <form class="row wrap" onSubmit={grantPlan}><input value={grantUser} onInput={(e) => setGrantUser((e.target as HTMLInputElement).value)} placeholder="email or @username" required /><select value={grantCode} onChange={(e) => setGrantCode((e.target as HTMLSelectElement).value)}>{SKUS.map((c) => <option value={c}>{c}</option>)}</select><button class="btn primary">Grant</button>{gmsg && <span class="muted">{gmsg}</span>}</form>
      </section>
      <section class="card">
        <h2>Admins</h2>
        <p class="muted small">Admins can use this panel: bundles, pricing, coupons, purchases and user details. Owner accounts (server config): {admins?.env_admins.join(', ') || '—'}</p>
        <form class="row wrap" onSubmit={addAdmin}><input type="email" value={newAdmin} onInput={(e) => setNewAdmin((e.target as HTMLInputElement).value)} placeholder="email@gmail.com" required /><button class="btn primary">Make admin</button>{amsg && <span class="muted">{amsg}</span>}</form>
        {admins && admins.admins.length > 0 && (
          <table class="tbl"><thead><tr><th>Email</th><th>Added</th><th>Status</th><th></th></tr></thead>
            <tbody>{admins.admins.map((a) => <tr key={a.email}><td>{a.email}</td><td class="muted">{fmtDate(a.created_at)}</td><td><span class={`pill ${a.signed_in ? 'live' : 'pending'}`}>{a.signed_in ? 'active' : 'pending sign-in'}</span></td><td class="right"><button class="btn sm" onClick={() => removeAdmin(a.email)}>Remove</button></td></tr>)}</tbody></table>
        )}
      </section>
      <div class="titlebar"><h1>Users</h1><span class="muted">{users ? `${users.length} shown` : ''}</span><span class="spacer" /><form class="row" onSubmit={(e) => { e.preventDefault(); load(q); }}><input value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="search email, username, name" /><button class="btn">Search</button></form></div>
      <section class="card">{!users ? <p class="muted">Loading…</p> : (
        <table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Username</th><th>Role</th><th>Plan</th><th>Joined</th><th>Taken</th><th>Hosted</th><th>Purchases</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td>{u.display_name ?? u.name ?? '—'}</td><td class="muted">{u.email}</td><td>{u.username ? `@${u.username}` : '—'}</td><td>{u.role}</td><td>{u.plan}{u.plan !== 'free' && u.plan_expires_at ? <div class="muted small">till {fmtDate(u.plan_expires_at)}</div> : null}{u.paper_credits ? <div class="muted small">{u.paper_credits} credits</div> : null}</td><td class="muted">{fmtDate(u.created_at)}</td><td>{u.tests_taken}</td><td>{u.tests_hosted}</td><td>{u.purchases}</td></tr>)}</tbody></table>
      )}</section>
    </>
  );
}
