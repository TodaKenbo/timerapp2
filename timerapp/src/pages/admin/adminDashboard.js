// ============================================
// Admin — Dashboard
// ============================================

import { getCachedProfile } from '../../auth.js';
import { getAllUsers, getAllUsersLogs } from '../../store.js';
import { formatDuration, formatDurationShort } from '../../utils/helpers.js';
import { router } from '../../router.js';

export async function renderAdminDashboard(container) {
  const profile = getCachedProfile();
  if (!profile || profile.role !== 'admin') {
    container.innerHTML = '<p style="color:var(--danger);">管理者権限が必要です</p>';
    return;
  }

  container.innerHTML = `<div class="page-header"><h1 class="page-title">管理パネル</h1></div><div class="text-center" style="color:var(--text-secondary);">読み込み中...</div>`;

  const users = await getAllUsers();
  const logs = await getAllUsersLogs();
  const today = new Date().toISOString().slice(0, 10);

  const todayLogs = logs.filter(l => (l.startTime || '').slice(0, 10) === today);
  const todayUsers = [...new Set(todayLogs.map(l => l.userId))];
  const totalToday = todayLogs.reduce((s, l) => s + (l.duration || 0), 0);
  const totalAll = logs.reduce((s, l) => s + (l.duration || 0), 0);

  // User rankings
  const userTotals = {};
  logs.forEach(l => { userTotals[l.userId] = (userTotals[l.userId] || 0) + (l.duration || 0); });
  const ranking = Object.entries(userTotals)
    .map(([uid, sec]) => { const u = users.find(x => x.uid === uid); return { uid, name: u?.displayName || u?.studentId || '不明', seconds: sec }; })
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 10);

  const students = users.filter(u => u.role !== 'admin');

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">管理パネル</h1>
      <p class="page-subtitle">クラス全体の管理</p>
    </div>

    <!-- Admin Nav -->
    <div class="grid-2 mb-lg">
      <button class="btn btn-secondary btn-block" id="nav-users" style="padding:var(--space-md);">
        👥 ユーザー管理
      </button>
      <button class="btn btn-secondary btn-block" id="nav-ann" style="padding:var(--space-md);">
        📢 お知らせ
      </button>
    </div>

    <!-- Stats -->
    <div class="grid-2 mb-lg">
      <div class="card card-sm stat-card">
        <span class="stat-label">今日のアクティブ</span>
        <span class="stat-value gradient">${todayUsers.length}<span style="font-size:var(--text-sm);color:var(--text-secondary);font-weight:400;">/${students.length}人</span></span>
      </div>
      <div class="card card-sm stat-card">
        <span class="stat-label">今日の総学習</span>
        <span class="stat-value gradient">${formatDuration(totalToday)}</span>
      </div>
    </div>

    <div class="grid-2 mb-lg">
      <div class="card card-sm stat-card">
        <span class="stat-label">登録ユーザー</span>
        <span class="stat-value">${students.length}<span style="font-size:var(--text-sm);color:var(--text-secondary);font-weight:400;">名</span></span>
      </div>
      <div class="card card-sm stat-card">
        <span class="stat-label">累計学習時間</span>
        <span class="stat-value">${formatDuration(totalAll)}</span>
      </div>
    </div>

    <!-- Ranking -->
    <div class="card">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">学習時間ランキング</h2>
      <div class="flex-col">
        ${ranking.length > 0 ? ranking.map((r, i) => `
          <div class="log-entry">
            <div class="log-icon" style="background:hsla(${i < 3 ? '40,90%,55%' : '200,90%,55%'},0.12);font-size:14px;font-weight:700;">
              ${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
            </div>
            <div class="log-details">
              <div class="log-material">${r.name}</div>
            </div>
            <div class="log-duration">${formatDurationShort(r.seconds)}</div>
          </div>
        `).join('') : '<p style="color:var(--text-secondary);text-align:center;">データなし</p>'}
      </div>
    </div>
  `;

  container.querySelector('#nav-users')?.addEventListener('click', () => router.navigate('/admin/users'));
  container.querySelector('#nav-ann')?.addEventListener('click', () => router.navigate('/admin/announcements'));
}
