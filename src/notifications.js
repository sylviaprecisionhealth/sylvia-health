// Sylvia Health - Web Push / Notification Scheduling

export const SESSION_TIMES = ['09:00', '12:00', '15:00', '18:00', '21:00'];

let _swReg = null;

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    _swReg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return _swReg;
  } catch (e) {
    console.warn('SW registration failed:', e);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export async function scheduleSessionNotifications() {
  const reg = _swReg || await registerServiceWorker();
  if (!reg || !reg.active) return;
  reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATIONS', times: SESSION_TIMES });
}

export function listenForSessionOpen(callback) {
  if (!('serviceWorker' in navigator)) return () => {};
  const handler = e => { if (e.data?.type === 'OPEN_SESSION') callback(); };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}

// In-app banner scheduler — fires a callback at each session time while app is open
export function startInAppScheduler(callback) {
  const timers = [];

  function scheduleNext() {
    const now = new Date();
    SESSION_TIMES.forEach(t => {
      const [h, m] = t.split(':').map(Number);
      const next = new Date();
      next.setHours(h, m, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const ms = next - now;
      const id = setTimeout(() => {
        callback(t);
        // Reschedule 1 minute after firing
        setTimeout(scheduleNext, 60 * 1000);
      }, ms);
      timers.push(id);
    });
  }

  scheduleNext();
  return () => timers.forEach(clearTimeout);
}

// Check if current time is within 30 min of a session time
export function isSessionTime() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return SESSION_TIMES.some(t => {
    const [h, m] = t.split(':').map(Number);
    const sessionMins = h * 60 + m;
    return Math.abs(nowMins - sessionMins) <= 30;
  });
}

export function nextSessionTime() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const t of SESSION_TIMES) {
    const [h, m] = t.split(':').map(Number);
    const sessionMins = h * 60 + m;
    if (sessionMins > nowMins) {
      return `${t} today`;
    }
  }
  return `${SESSION_TIMES[0]} tomorrow`;
}
