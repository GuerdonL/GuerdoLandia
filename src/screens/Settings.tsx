import { useRef, useState } from 'react';
import { useStore } from '../store';
import type { Tab } from '../App';

export function Settings({ go }: { go: (t: Tab) => void }) {
  const { googleClientId, setGoogleClientId, notifications, setNotifications, resetEverything } = useStore();
  const [clientId, setClientId] = useState(googleClientId);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const enableNotifications = async (on: boolean) => {
    if (!on) return setNotifications(false);
    if (typeof Notification === 'undefined') return setMsg('This browser does not support notifications.');
    const p = await Notification.requestPermission();
    setNotifications(p === 'granted');
    if (p !== 'granted') setMsg('Notifications were blocked. You can allow them in your browser’s site settings.');
  };

  const exportData = () => {
    const raw = localStorage.getItem('guerdolandia') ?? '{}';
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `guerdolandia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.state) throw new Error('Not a GuerdoLandia backup');
      localStorage.setItem('guerdolandia', text);
      location.reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <div className="screen settings">
      <section className="card">
        <h1>Settings</h1>
        <button className="btn" onClick={() => go('creator')}>👤 Edit my character</button>
      </section>

      <section className="card">
        <h2>Google Calendar</h2>
        <p className="hint">
          Paste an OAuth <strong>Web application</strong> client ID from Google Cloud Console (APIs &amp; Services → Credentials), with the Google
          Calendar API enabled and <code>{location.origin}</code> added as an authorized JavaScript origin. Your token stays in this browser.
        </p>
        <label className="field">
          <span>OAuth client ID</span>
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1234-abc.apps.googleusercontent.com" />
        </label>
        <button
          className="btn primary"
          onClick={() => {
            setGoogleClientId(clientId);
            setMsg('Saved. Open the Calendar tab to connect.');
          }}
        >
          Save
        </button>
      </section>

      <section className="card">
        <h2>Reminders</h2>
        <label className="toggle">
          <input type="checkbox" checked={notifications} onChange={(e) => enableNotifications(e.target.checked)} />
          Notify me when my character urgently needs something, and when a timer finishes
        </label>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="hint">Everything lives on this device. Back it up or move it to another device with a file.</p>
        <div className="row gap wrap">
          <button className="btn" onClick={exportData}>⬇ Export backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆ Import backup</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <a className="btn ghost" href="#gallery">🎞 Animation gallery</a>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Erase your character, quests and calendar on this device?')) resetEverything();
            }}
          >
            Reset everything
          </button>
        </div>
      </section>
      {msg && <p className="toast-inline">{msg}</p>}
    </div>
  );
}
