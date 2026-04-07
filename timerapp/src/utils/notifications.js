// ============================================
// Notification Helper
// ============================================

let permissionGranted = false;

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
}

export function sendNotification(title, body, icon = '📚') {
  if (!permissionGranted && Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'study-tracker',
      renotify: true,
    });
  } catch {
    // Notification may fail in some contexts
  }
}

// Simple beep sound using Web Audio API
export function playSound(type = 'complete') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'complete') {
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'tick') {
      osc.frequency.value = 600;
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch {
    // Audio context may not be available
  }
}
