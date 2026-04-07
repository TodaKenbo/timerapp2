// ============================================
// Class Stats Page
// ============================================

import { getAllUsers, getAllUsersLogs } from '../store.js';
import { formatDuration, formatDurationShort } from '../utils/helpers.js';

export async function renderClassStats(container) {
  container.innerHTML = `<div class="page-header"><h1 class="page-title">クラス統計</h1></div><div class="text-center" style="color:var(--text-secondary);">読み込み中...</div>`;

  const users = await getAllUsers();
  const logs = await getAllUsersLogs();
  const today = new Date().toISOString().slice(0, 10);
  const students = users.filter(u => u.role !== 'admin');

  const todayLogs = logs.filter(l => (l.startTime || '').slice(0, 10) === today);
  const totalToday = todayLogs.reduce((s, l) => s + (l.duration || 0), 0);
  const totalAll = logs.reduce((s, l) => s + (l.duration || 0), 0);
  const activeToday = [...new Set(todayLogs.map(l => l.userId))].length;

  // Per-user totals
  const userTotals = {};
  logs.forEach(l => { userTotals[l.userId] = (userTotals[l.userId] || 0) + (l.duration || 0); });
  const ranking = Object.entries(userTotals)
    .map(([uid, sec]) => { const u = users.find(x => x.uid === uid); return { name: u?.displayName || u?.studentId || '???', seconds: sec }; })
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 10);

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">クラス統計</h1>
      <p class="page-subtitle">みんなの学習状況</p>
    </div>

    <div class="grid-3 mb-lg">
      <div class="card card-sm stat-card text-center">
        <span class="stat-label">本日</span>
        <span class="stat-value gradient" style="font-size:var(--text-xl);">${formatDurationShort(totalToday)}</span>
      </div>
      <div class="card card-sm stat-card text-center">
        <span class="stat-label">参加</span>
        <span class="stat-value" style="font-size:var(--text-xl);">${activeToday}人</span>
      </div>
      <div class="card card-sm stat-card text-center">
        <span class="stat-label">累計</span>
        <span class="stat-value" style="font-size:var(--text-xl);">${formatDurationShort(totalAll)}</span>
      </div>
    </div>

    <div class="card">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">🏆 学習ランキング</h2>
      <div class="flex-col">
        ${ranking.length > 0 ? ranking.map((r, i) => `
          <div class="log-entry">
            <div class="log-icon" style="background:hsla(${i < 3 ? '40,90%,55%' : '250,20%,30%'},0.15);font-weight:700;font-size:14px;">
              ${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
            </div>
            <div class="log-details">
              <div class="log-material">${r.name}</div>
            </div>
            <div class="log-duration">${formatDurationShort(r.seconds)}</div>
          </div>
        `).join('') : '<p style="color:var(--text-secondary);text-align:center;">まだデータがありません</p>'}
      </div>
    </div>
  `;
}
