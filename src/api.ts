// Admin API client. The API lives on the main site; the session token is the same Google-backed session.
// Served by the main site (paper2test.app/admin/ or a local dev server): same origin. Elsewhere (Vercel): the live API.
const SAME_ORIGIN = /(^|\.)paper2test\.app$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) && location.pathname.startsWith('/admin');
const DEFAULT_API = SAME_ORIGIN ? `${location.origin}/api` : 'https://paper2test.app/api';
export const API = (() => { try { return localStorage.getItem('p2t.admin.api') || DEFAULT_API; } catch { return DEFAULT_API; } })();
const TOKEN_KEY = 'p2t.admin.token';
// Session hand-over from the Android app (?tok=...): keep it, then clean the address bar.
try { const tok = new URLSearchParams(location.search).get('tok'); if (tok) { localStorage.setItem(TOKEN_KEY, tok); history.replaceState(null, '', location.pathname + location.hash); } } catch { /* storage blocked */ }
export const session = {
  // On paper2test.app the admin panel shares the website's sign-in.
  get token(): string | null { try { return localStorage.getItem(TOKEN_KEY) ?? (SAME_ORIGIN ? localStorage.getItem('p2t.host.token') : null); } catch { return null; } },
  set token(v: string | null) { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch {} },
};
export class ApiError extends Error { constructor(public status: number, public code: string, public data: any) { super(code); } }
export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (session.token) headers.authorization = `Bearer ${session.token}`;
  const res = await fetch(API + path, { method: init.method ?? 'GET', headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { if (res.status === 401) session.token = null; throw new ApiError(res.status, data.error ?? res.statusText, data); }
  return data as T;
}
/** Raw upload (cover image, study-material piece). */
export async function apiRaw<T = any>(path: string, method: string, body: Blob | ArrayBuffer, contentType: string): Promise<T> {
  const headers: Record<string, string> = { 'content-type': contentType };
  if (session.token) headers.authorization = `Bearer ${session.token}`;
  const res = await fetch(API + path, { method, headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? res.statusText, data);
  return data as T;
}
export const rupees = (paise: number) => `₹${(paise / 100).toFixed(paise % 100 ? 2 : 0)}`;
export const fmtDate = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const toPaise = (r: string) => Math.round(Number(r || 0) * 100);
export const fromPaise = (p: number | null | undefined) => (p == null ? '' : String(p / 100));
