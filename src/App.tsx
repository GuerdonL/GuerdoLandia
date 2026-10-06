import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { chime, notify, useVitals } from './hooks';
import { Home } from './screens/Home';
import { Creator } from './screens/Creator';
import { Quests } from './screens/Quests';
import { Calendar } from './screens/Calendar';
import { Timer } from './screens/Timer';
import { Settings } from './screens/Settings';
import { Gallery } from './components/Gallery';
import { STAT_INFO } from './game/stats';
import { LootReveal } from './adventure/LootReveal';

export type Tab = 'home' | 'quests' | 'calendar' | 'timer' | 'creator' | 'settings';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Me', icon: '🏠' },
  { id: 'quests', label: 'Quests', icon: '📜' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'timer', label: 'Adventure', icon: '⚔️' },
  { id: 'settings', label: 'More', icon: '⚙️' },
];

export default function App() {
  const appearance = useStore((s) => s.appearance);
  const timer = useStore((s) => s.timer);
  const celebrate = useStore((s) => s.celebrate);
  const [tab, setTab] = useState<Tab>('home');
  const [scheduleQuestId, setScheduleQuestId] = useState<string>();
  const [hash, setHash] = useState(location.hash);
  const { alerts } = useVitals();

  useEffect(() => {
    const onHash = () => setHash(location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Heartbeat: needs decay over real time, and the timer advances even when its screen is closed.
  useEffect(() => {
    const { tick, timerTick } = useStore.getState();
    tick();
    timerTick();
    const id = setInterval(() => {
      useStore.getState().timerTick();
      useStore.getState().tick();
    }, 1000);
    const onVisible = () => document.visibilityState === 'visible' && useStore.getState().tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // When a scheduled block for a quest begins, the adventure starts on its own.
  useEffect(() => {
    const check = () => {
      const s = useStore.getState();
      if (s.timer || !s.appearance) return;
      const now = Date.now();
      const live = s.blocks.find(
        (b) => b.questId && !s.autoStartedBlocks.includes(b.id) && new Date(b.start).getTime() <= now && new Date(b.end).getTime() > now + 60_000,
      );
      if (!live) return;
      const quest = s.quests.find((q) => q.id === live.questId && !q.completedAt);
      s.markAutoStarted(live.id);
      if (!quest) return;
      s.startTimer({ mode: 'block', blockId: live.id });
      setTab('timer');
      chime();
      notify('⚔️ A quest begins!', `${quest.title} — your hero sets out.`);
    };
    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, []);

  // Chime + notify when a timer phase changes.
  const prevPhase = useRef(timer ? `${timer.phase}:${timer.cycle}` : 'none');
  useEffect(() => {
    const key = timer ? `${timer.phase}:${timer.cycle}` : 'none';
    if (key !== prevPhase.current) {
      const wasRunning = prevPhase.current !== 'none';
      prevPhase.current = key;
      if (wasRunning && celebrate && Date.now() - celebrate.at < 3000) {
        chime();
        notify('GuerdoLandia', celebrate.text);
      }
    }
  }, [timer, celebrate]);

  // Notify about urgent needs, at most once per need every 3 hours.
  useEffect(() => {
    for (const a of alerts) {
      if (a.severity !== 'urgent') continue;
      const key = `guerdolandia.notified.${a.stat}`;
      const last = Number(localStorage.getItem(key) ?? 0);
      if (Date.now() - last > 3 * 3_600_000) {
        localStorage.setItem(key, String(Date.now()));
        const name = a.stat === 'health' ? 'Health' : STAT_INFO[a.stat].low;
        notify(`${appearance?.name || 'Your character'}: ${name}`, a.message);
      }
    }
  }, [alerts, appearance?.name]);

  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    const onUpdate = (e: Event) => setUpdate((e as CustomEvent<ServiceWorker>).detail);
    window.addEventListener('app-update', onUpdate);
    return () => window.removeEventListener('app-update', onUpdate);
  }, []);

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!celebrate || Date.now() - celebrate.at > 3000) return;
    setToast(celebrate.text);
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [celebrate]);

  const go = useCallback((t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  }, []);
  const clearSchedule = useCallback(() => setScheduleQuestId(undefined), []);

  if (hash === '#gallery') {
    return (
      <div className="app">
        <a className="btn" href="#" onClick={() => (location.hash = '')}>← Back</a>
        <Gallery appearance={appearance} />
      </div>
    );
  }

  if (!appearance) {
    return (
      <div className="app">
        <Creator firstTime onDone={() => setTab('home')} />
      </div>
    );
  }

  const urgent = alerts.some((a) => a.severity === 'urgent');

  return (
    <div className="app has-nav">
      <main>
        {tab === 'home' && <Home go={go} />}
        {tab === 'quests' && (
          <Quests
            go={go}
            onSchedule={(id) => {
              setScheduleQuestId(id);
              go('calendar');
            }}
          />
        )}
        {tab === 'calendar' && <Calendar go={go} scheduleQuestId={scheduleQuestId} clearSchedule={clearSchedule} />}
        {tab === 'timer' && <Timer />}
        {tab === 'creator' && <Creator firstTime={false} onDone={() => go('home')} />}
        {tab === 'settings' && <Settings go={go} />}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
      <LootReveal />
      {update && (
        <button className="toast update" onClick={() => update.postMessage('skipWaiting')}>
          ✨ A new version is ready. Tap to update
        </button>
      )}
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <button key={n.id} className={tab === n.id || (n.id === 'settings' && tab === 'creator') ? 'active' : ''} onClick={() => go(n.id)}>
            <span className="nav-icon">
              {n.icon}
              {n.id === 'home' && urgent && <i className="dot" />}
              {n.id === 'timer' && timer?.running && <i className="dot live" />}
            </span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
