// ============================================
// Dashboard Page (v2 — with announcements & quick start)
// ============================================

import {
  getTodayTotalSeconds, getTodayLogs, getStreak, getDailyTotals,
  getMaterialTimeDistribution, getMaterial, getLogs, getAnnouncements, getMaterials,
} from '../store.js';
import { getCachedProfile } from '../auth.js';
import { formatDuration, formatDurationShort, formatDateTime, getModeIcon } from '../utils/helpers.js';
import { router } from '../router.js';

export async function renderDashboard(container) {
  const profile = getCachedProfile();

  // Show loading
  container.innerHTML = `<div class="page-header"><h1 class="page-title">ホーム</h1></div><div class="text-center" style="color:var(--text-secondary);">読み込み中...</div>`;

  const [todaySeconds, todayLogs, streak, dailyTotals, distribution, recentLogs, announcements, materials] = await Promise.all([
    getTodayTotalSeconds(), getTodayLogs(), getStreak(),
    getDailyTotals(7), getMaterialTimeDistribution(),
    getLogs().then(l => l.slice(0, 5)), getAnnouncements(), getMaterials(),
  ]);

  // Find last used material
  const lastMaterial = recentLogs.length > 0 ? await getMaterial(recentLogs[0].materialId) : null;

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h1 class="page-title">${getGreeting()}</h1>
          <p class="page-subtitle">${profile?.displayName || 'ゲスト'}さん</p>
        </div>
        ${streak > 0 ? `
          <div class="streak-container">
            <span class="streak-fire">🔥</span>
            <span class="streak-count">${streak}</span>
            <span class="streak-label">日連続</span>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Announcements -->
    ${announcements.length > 0 ? `
      <div class="announcement-banner mb-lg" id="announcement-area">
        ${announcements.map(a => `
          <div class="card card-sm" style="background:hsla(40,90%,55%,0.08);border-color:hsla(40,90%,55%,0.15);margin-bottom:var(--space-sm);">
            <div style="display:flex;align-items:center;gap:var(--space-sm);">
              <span style="font-size:18px;">📢</span>
              <div>
                <div style="font-size:var(--text-sm);font-weight:600;color:hsl(40,90%,65%);">${a.title}</div>
                ${a.body ? `<div style="font-size:var(--text-xs);color:var(--text-secondary);">${a.body}</div>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Quick Start Button -->
    <div class="card mb-lg text-center" style="padding:var(--space-xl);" id="quick-start-card">
      <button class="btn btn-primary btn-lg" id="btn-quick-start" style="padding:var(--space-md) var(--space-2xl);font-size:var(--text-lg);border-radius:var(--radius-xl);">
        ▶ 今すぐ開始
      </button>
      ${lastMaterial ? `<p style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:var(--space-sm);">${lastMaterial.title} の続きから</p>` : ''}
    </div>

    <!-- Today Stats -->
    <div class="grid-2 mb-lg">
      <div class="card card-sm stat-card">
        <span class="stat-label">今日の学習時間</span>
        <span class="stat-value gradient">${formatDuration(todaySeconds)}</span>
      </div>
      <div class="card card-sm stat-card">
        <span class="stat-label">セッション数</span>
        <span class="stat-value">${todayLogs.length}<span style="font-size:var(--text-sm);color:var(--text-secondary);font-weight:400;"> 回</span></span>
      </div>
    </div>

    <!-- Weekly Chart -->
    <div class="card mb-lg">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-md);">
        <h2 style="font-size:var(--text-lg);font-weight:600;">週間学習時間</h2>
        <span style="font-size:var(--text-xs);color:var(--text-secondary);">過去7日間</span>
      </div>
      <div class="chart-container"><canvas id="weekly-chart"></canvas></div>
    </div>

    <!-- Distribution Chart -->
    ${distribution.length > 0 ? `
    <div class="card mb-lg">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">教材別時間配分</h2>
      <div class="chart-container" style="aspect-ratio:1/1;max-width:240px;margin:0 auto;">
        <canvas id="distribution-chart"></canvas>
      </div>
      <div class="flex-col gap-sm mt-md" id="distribution-legend"></div>
    </div>
    ` : ''}

    <!-- Recent Activity -->
    <div class="card">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">最近のアクティビティ</h2>
      ${recentLogs.length > 0 ? `<div class="flex-col">${await renderRecentLogs(recentLogs)}</div>` : `
        <div class="empty-state"><div class="empty-state-icon">📖</div><p class="empty-state-text">まだ学習記録がありません<br>タイマーで学習を始めましょう！</p></div>
      `}
    </div>
  `;

  // Quick start button
  container.querySelector('#btn-quick-start')?.addEventListener('click', () => {
    if (lastMaterial) sessionStorage.setItem('timer_materialId', lastMaterial.id);
    router.navigate('/timer');
  });

  // Charts
  requestAnimationFrame(() => {
    renderWeeklyChart(dailyTotals);
    if (distribution.length > 0) renderDistributionChart(distribution);
  });
}

async function renderRecentLogs(logs) {
  let html = '';
  for (const log of logs) {
    const mat = await getMaterial(log.materialId);
    html += `
      <div class="log-entry">
        <div class="log-icon ${log.mode}">${getModeIcon(log.mode)}</div>
        <div class="log-details">
          <div class="log-material">${mat ? mat.title : '不明な教材'}</div>
          <div class="log-time-info">${formatDateTime(log.startTime)}</div>
        </div>
        <div class="log-duration">${formatDurationShort(log.duration)}</div>
      </div>`;
  }
  return html;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'おやすみ前の学習 🌙';
  if (h < 12) return 'おはようございます ☀️';
  if (h < 18) return 'がんばっていますね 💪';
  return 'お疲れさまです 🌙';
}

function renderWeeklyChart(dailyTotals) {
  const canvas = document.getElementById('weekly-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight);
  gradient.addColorStop(0, 'hsla(260, 85%, 65%, 0.8)');
  gradient.addColorStop(1, 'hsla(200, 90%, 55%, 0.3)');
  new Chart(ctx, {
    type: 'bar',
    data: { labels: dailyTotals.map(d => d.dayOfWeek), datasets: [{ data: dailyTotals.map(d => Math.round(d.totalSeconds / 60)), backgroundColor: gradient, borderRadius: 6, borderSkipped: false, barPercentage: 0.6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.raw}分` }, backgroundColor: 'hsl(250,25%,14%)', cornerRadius: 8, padding: 10 } }, scales: { x: { grid: { display: false }, ticks: { color: 'hsl(250,15%,50%)', font: { size: 11 } }, border: { display: false } }, y: { grid: { color: 'hsla(250,20%,30%,0.2)' }, ticks: { color: 'hsl(250,15%,50%)', font: { size: 11 }, callback: v => `${v}分` }, border: { display: false }, beginAtZero: true } } },
  });
}

function renderDistributionChart(distribution) {
  const canvas = document.getElementById('distribution-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const colors = ['hsl(260,85%,65%)', 'hsl(200,90%,55%)', 'hsl(160,70%,45%)', 'hsl(40,90%,55%)', 'hsl(330,75%,60%)', 'hsl(290,70%,55%)', 'hsl(20,85%,55%)', 'hsl(180,70%,45%)'];
  new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels: distribution.map(d => d.title), datasets: [{ data: distribution.map(d => Math.round(d.totalSeconds / 60)), backgroundColor: colors.slice(0, distribution.length), borderWidth: 0, spacing: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.label}: ${c.raw}分` }, backgroundColor: 'hsl(250,25%,14%)', cornerRadius: 8, padding: 10 } } },
  });
  const el = document.getElementById('distribution-legend');
  if (el) el.innerHTML = distribution.map((d, i) => `<div style="display:flex;align-items:center;gap:8px;"><span style="width:10px;height:10px;border-radius:50%;background:${colors[i % colors.length]};flex-shrink:0;"></span><span style="flex:1;font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.title}</span><span style="font-size:var(--text-sm);color:var(--text-secondary);white-space:nowrap;">${formatDurationShort(d.totalSeconds)}</span></div>`).join('');
}
