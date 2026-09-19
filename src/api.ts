// Admin API client. The API lives on the main site; the session token is the same Google-backed session.
const DEFAULT_API = 'https://paper2test.app/api';
export const API = (() => { try { return localStorage.getItem('p2t.admin.api') || DEFAULT_API; } catch { return DEFAULT_API; } })();
const TOKEN_KEY = 'p2t.admin.token';
export const session = {
  get token(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
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
export const rupees = (paise: number) => `₹${(paise / 100).toFixed(paise % 100 ? 2 : 0)}`;
export const fmtDate = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const toPaise = (r: string) => Math.round(Number(r || 0) * 100);
export const fromPaise = (p: number | null | undefined) => (p == null ? '' : String(p / 100));
