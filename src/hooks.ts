import { useEffect, useState } from 'react';
import { useStore } from './store';
import { alertsFor, healthOf, moodOf } from './game/stats';
import type { Activity } from './types';

/** Derived vitals for the character. */
export function useVitals() {
  const stats = useStore((s) => s.stats);
  const asleep = useStore((s) => s.asleep);
  const sick = useStore((s) => s.feelingSick);
  const health = healthOf(stats, sick);
  const mood = moodOf(stats, health, asleep);
  const alerts = alertsFor(stats, health, asleep);
  return { stats, asleep, sick, health, mood, alerts };
}

/** What the character is doing right now (timer > sleep > idle). */
export function useCurrentActivity(): Activity {
  const timer = useStore((s) => s.timer);
  const asleep = useStore((s) => s.asleep);
  if (timer && timer.phase === 'focus' && timer.running) return timer.activity;
  if (timer && timer.phase !== 'focus') return 'idle';
  if (asleep) return 'sleep';
  return 'idle';
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
}

export function notify(title: string, body: string) {
  if (!useStore.getState().notifications || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const opts = { body, icon: './icon-192.png', badge: './icon-192.png' };
  try {
    // Android Chrome only allows notifications through the service worker.
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, opts)).catch(() => undefined);
    } else new Notification(title, opts);
  } catch {
    // Notifications are best-effort.
  }
}

/** A short chime via WebAudio (no asset needed). */
export function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880, 990].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch {
    // Audio is best-effort.
  }
}
