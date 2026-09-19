import { useEffect, useState } from 'preact/hooks';
import { api, fmtDate } from './api';
type U = { id: string; email: string | null; name: string | null; display_name: string | null; username: string | null; plan: string; role: string; created_at: number; tests_taken: number; tests_hosted: number; purchases: number };
export function Users() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<U[] | null>(null);
  const load = (query = '') => api<{ users: U[] }>(`/admin/users?q=${encodeURIComponent(query)}`).then((r) => setUsers(r.users));
  useEffect(() => { load(); }, []);
  return (
    <>
      <div class="titlebar"><h1>Users</h1><span class="muted">{users ? `${users.length} shown` : ''}</span><span class="spacer" /><form class="row" onSubmit={(e) => { e.preventDefault(); load(q); }}><input value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} placeholder="search email, username, name" /><button class="btn">Search</button></form></div>
      <section class="card">{!users ? <p class="muted">Loading…</p> : (
        <table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Username</th><th>Role</th><th>Plan</th><th>Joined</th><th>Taken</th><th>Hosted</th><th>Purchases</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td>{u.display_name ?? u.name ?? '—'}</td><td class="muted">{u.email}</td><td>{u.username ? `@${u.username}` : '—'}</td><td>{u.role}</td><td>{u.plan}</td><td class="muted">{fmtDate(u.created_at)}</td><td>{u.tests_taken}</td><td>{u.tests_hosted}</td><td>{u.purchases}</td></tr>)}</tbody></table>
      )}</section>
    </>
  );
}
