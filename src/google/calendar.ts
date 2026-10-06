// Google Calendar sync via Google Identity Services (browser OAuth token flow)
// and the Calendar v3 REST API. No backend needed: the access token lives in
// memory/sessionStorage only and expires after an hour.

import type { TimeBlock } from '../types';
import { classifyActivity } from '../game/classifier';

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TOKEN_KEY = 'guerdolandia.gtoken';
const TAG = 'guerdolandia';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string }) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: unknown) => void }) => TokenClient;
          revoke: (token: string, cb?: () => void) => void;
        };
      };
    };
  }
}

let gisLoading: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisLoading = null;
      reject(new Error('Couldn’t reach Google sign-in. Check your connection; calendar sync also needs the app’s own website, not an embedded preview.'));
    };
    document.head.appendChild(s);
  });
  return gisLoading;
}

function storedToken(): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, exp } = JSON.parse(raw) as { token: string; exp: number };
    return Date.now() < exp - 60_000 ? token : null;
  } catch {
    return null;
  }
}

export function isConnected(): boolean {
  return storedToken() !== null;
}

/** Opens Google's consent popup (must be called from a click handler). */
export async function connect(clientId: string): Promise<string> {
  if (!clientId) throw new Error('Add your Google OAuth client ID in Settings first.');
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error ?? 'Google sign-in failed'));
        sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: r.access_token, exp: Date.now() + (r.expires_in ?? 3600) * 1000 }));
        resolve(r.access_token);
      },
      error_callback: (e) => reject(new Error((e as { message?: string })?.message ?? 'Sign-in was cancelled')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function disconnect() {
  const t = storedToken();
  sessionStorage.removeItem(TOKEN_KEY);
  if (t) window.google?.accounts.oauth2.revoke(t);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = storedToken();
  if (!token) throw new Error('Not connected to Google Calendar');
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    throw new Error('Google session expired — connect again');
  }
  if (!res.ok && res.status !== 410) throw new Error(`Google Calendar error ${res.status}`);
  return (res.status === 204 || res.status === 410 ? undefined : await res.json()) as T;
}

interface GEvent {
  id: string;
  summary?: string;
  status?: string;
  updated: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
}

function toBlock(e: GEvent): TimeBlock | null {
  // All-day events don't make sense as focus blocks.
  if (!e.start.dateTime || !e.end.dateTime || e.status === 'cancelled') return null;
  const p = e.extendedProperties?.private ?? {};
  const title = e.summary ?? '(untitled)';
  return {
    id: p[`${TAG}Id`] ?? `g-${e.id}`,
    title,
    questId: p[`${TAG}Quest`] || undefined,
    activity: (p[`${TAG}Activity`] as TimeBlock['activity']) ?? classifyActivity(title).activity,
    start: new Date(e.start.dateTime).toISOString(),
    end: new Date(e.end.dateTime).toISOString(),
    googleEventId: e.id,
    source: p[`${TAG}Id`] ? 'local' : 'google',
    updatedAt: e.updated,
    syncedAt: e.updated,
  };
}

export async function listEvents(timeMin: string, timeMax: string): Promise<TimeBlock[]> {
  const out: TimeBlock[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
    if (pageToken) q.set('pageToken', pageToken);
    const r = await api<{ items: GEvent[]; nextPageToken?: string }>(`?${q}`);
    for (const e of r.items) {
      const b = toBlock(e);
      if (b) out.push(b);
    }
    pageToken = r.nextPageToken;
  } while (pageToken);
  return out;
}

function eventBody(b: TimeBlock) {
  return {
    summary: b.title,
    start: { dateTime: b.start },
    end: { dateTime: b.end },
    description: 'Scheduled with GuerdoLandia — be kind to yourself 💜',
    extendedProperties: {
      private: { [`${TAG}Id`]: b.id, [`${TAG}Quest`]: b.questId ?? '', [`${TAG}Activity`]: b.activity },
    },
  };
}

export async function upsertEvent(b: TimeBlock): Promise<string> {
  if (b.googleEventId) {
    const body = eventBody(b);
    // Events imported from Google keep their own description.
    if (b.source === 'google') delete (body as Partial<typeof body>).description;
    const r = await api<GEvent>(`/${encodeURIComponent(b.googleEventId)}`, { method: 'PATCH', body: JSON.stringify(body) });
    return r.id;
  }
  const r = await api<GEvent>('', { method: 'POST', body: JSON.stringify(eventBody(b)) });
  return r.id;
}

export async function deleteEvent(googleEventId: string) {
  await api<void>(`/${encodeURIComponent(googleEventId)}`, { method: 'DELETE' });
}

export interface SyncStore {
  blocks: TimeBlock[];
  pendingGoogleDeletes: string[];
  markSynced: (localId: string, googleEventId: string) => void;
  clearPendingDeletes: (ids: string[]) => void;
  mergeGoogleBlocks: (incoming: TimeBlock[], rangeStart: string, rangeEnd: string) => void;
}

/** Two-way sync for a date range: push deletes and local changes, then pull. */
export async function syncRange(getStore: () => SyncStore, rangeStart: Date, rangeEnd: Date) {
  const s = getStore();
  const deleted: string[] = [];
  for (const id of s.pendingGoogleDeletes) {
    await deleteEvent(id);
    deleted.push(id);
  }
  if (deleted.length) s.clearPendingDeletes(deleted);

  for (const b of getStore().blocks) {
    const dirty = !b.googleEventId || !b.syncedAt || b.updatedAt > b.syncedAt;
    if (!dirty) continue;
    const id = await upsertEvent(b);
    getStore().markSynced(b.id, id);
  }

  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();
  const remote = await listEvents(startIso, endIso);
  getStore().mergeGoogleBlocks(remote, startIso, endIso);
  return { pushed: deleted.length, pulled: remote.length };
}
