import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { api, session } from './api';
import { Login } from './Login';
import { Dashboard } from './Dashboard';
import { Bundles, BundleEdit } from './Bundles';
import { Coupons } from './Coupons';
import { Calendar } from './Calendar';
import { Announcements } from './Announcements';
import { Purchases } from './Purchases';
import { Users } from './Users';

export type Me = { id: string; name: string | null; email: string | null; username: string | null; role: string };
export const go = (h: string) => { location.hash = h; };

function useRoute() {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => { const f = () => setHash(location.hash || '#/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return hash.replace(/^#/, '').split('/').filter(Boolean);
}

function App() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const route = useRoute();
  useEffect(() => { if (!session.token) { setMe(null); return; } api<{ user: Me }>('/me').then((r) => setMe(r.user)).catch(() => setMe(null)); }, []);
  if (me === undefined) return <div class="center muted">Loading…</div>;
  if (!me) return <Login onLogin={setMe} />;
  if (me.role !== 'admin') return <div class="center"><div class="card"><p class="brand big"><span>Paper2</span>Test admin</p><p class="err">{me.email} is not an admin account.</p><button class="btn" onClick={() => { session.token = null; setMe(null); }}>Sign out</button></div></div>;

  let page;
  if (route[0] === 'bundles' && route[1]) page = <BundleEdit id={route[1]} />;
  else if (route[0] === 'bundles') page = <Bundles />;
  else if (route[0] === 'coupons') page = <Coupons />;
  else if (route[0] === 'calendar') page = <Calendar />;
  else if (route[0] === 'announce') page = <Announcements />;
  else if (route[0] === 'purchases') page = <Purchases />;
  else if (route[0] === 'users') page = <Users />;
  else page = <Dashboard />;
  const on = (k: string) => (route[0] === k || (!route[0] && k === '') ? 'on' : '');
  return (
    <>
      <header class="nav">
        <a href="#/" class="brand"><span>Paper2</span>Test <small>admin</small></a>
        <nav><a href="#/" class={on('')}>Dashboard</a><a href="#/bundles" class={on('bundles')}>Bundles</a><a href="#/calendar" class={on('calendar')}>Calendar</a><a href="#/announce" class={on('announce')}>Announce</a><a href="#/coupons" class={on('coupons')}>Coupons</a><a href="#/purchases" class={on('purchases')}>Purchases</a><a href="#/users" class={on('users')}>Users</a></nav>
        <div class="who"><span class="muted">{me.email}<span class="admintag">admin</span></span><button class="btn sm" onClick={() => { session.token = null; setMe(null); }}>Sign out</button></div>
      </header>
      <main class="page">{page}</main>
    </>
  );
}
render(<App />, document.getElementById('app')!);
