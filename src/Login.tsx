import { useEffect, useRef, useState } from 'preact/hooks';
import { api, session } from './api';
import type { Me } from './main';
declare global { interface Window { google?: any } }

export function Login({ onLogin }: { onLogin: (m: Me) => void }) {
  const btn = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<{ google_client_id: string | null }>('/config').then((cfg) => {
      if (!cfg.google_client_id) { setErr('Google Sign-In is not configured on the API.'); return; }
      const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => {
        window.google.accounts.id.initialize({ client_id: cfg.google_client_id, callback: async (resp: { credential: string }) => {
          try { const r = await api<{ token: string }>('/host/login', { method: 'POST', body: { id_token: resp.credential } }); session.token = r.token; onLogin((await api<{ user: Me }>('/me')).user); }
          catch (e: any) { setErr(e.data?.message ?? e.message); }
        } });
        if (btn.current) window.google.accounts.id.renderButton(btn.current, { theme: 'outline', size: 'large', width: 320 });
      };
      document.head.appendChild(s);
    }).catch((e) => setErr(e.message));
  }, []);
  return <div class="center"><div class="card login"><p class="brand big"><span>Paper2</span>Test <small>admin</small></p><p class="muted">Sign in with the admin Google account.</p><div ref={btn} class="gbtn" />{err && <p class="err">{err}</p>}</div></div>;
}
