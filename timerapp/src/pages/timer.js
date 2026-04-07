// ============================================
// Timer Page (v2 — async Firestore)
// ============================================

import { getMaterials, addLog, updateMaterial, getSettings } from '../store.js';
import { formatTimer, getTypeIcon } from '../utils/helpers.js';
import { sendNotification, requestNotificationPermission, playSound } from '../utils/notifications.js';

let timerInterval = null;
let timerState = {
  running: false, mode: 'timer', materialId: '', startTime: null,
  elapsed: 0, remaining: 0, pomodoroPhase: 'work', pomodoroCount: 0,
  totalDuration: 0, hiddenAt: null,
};

export async function renderTimer(container) {
  const materials = await getMaterials();
  const settings = getSettings();
  const preselectedId = sessionStorage.getItem('timer_materialId');
  if (preselectedId) { timerState.materialId = preselectedId; sessionStorage.removeItem('timer_materialId'); }
  requestNotificationPermission();
  const C = 2 * Math.PI * 115;

  container.innerHTML = `
    <div class="page-header"><h1 class="page-title">タイマー</h1></div>
    <div class="tabs mb-lg">
      <button class="tab-btn ${timerState.mode === 'timer' ? 'active' : ''}" data-mode="timer">⏱️ タイマー</button>
      <button class="tab-btn ${timerState.mode === 'pomodoro' ? 'active' : ''}" data-mode="pomodoro">🍅 ポモドーロ</button>
    </div>
    <div class="form-group mb-lg">
      <label class="form-label">学習する教材</label>
      <select class="form-select" id="timer-material-select">
        <option value="">-- 教材を選択 --</option>
        ${materials.map(m => `<option value="${m.id}" ${m.id === timerState.materialId ? 'selected' : ''}>${getTypeIcon(m.type)} ${m.title}</option>`).join('')}
      </select>
    </div>
    <div class="timer-ring-container ${timerState.running ? 'timer-running' : ''}" id="timer-display">
      <svg class="timer-ring-svg" viewBox="0 0 240 240">
        <defs><linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="hsl(260,85%,65%)"/><stop offset="100%" stop-color="hsl(200,90%,55%)"/></linearGradient></defs>
        <circle class="timer-ring-bg" cx="120" cy="120" r="115"/>
        <circle class="timer-ring-glow" cx="120" cy="120" r="115" stroke-dasharray="${C}" stroke-dashoffset="${C}" id="timer-ring-glow"/>
        <circle class="timer-ring-progress" cx="120" cy="120" r="115" stroke-dasharray="${C}" stroke-dashoffset="${C}" id="timer-ring-progress"/>
      </svg>
      <div class="timer-center">
        <div class="timer-time" id="timer-time">00:00</div>
        <div class="timer-label" id="timer-mode-label">${timerState.mode === 'pomodoro' ? 'ポモドーロ — 集中' : 'ストップウォッチ'}</div>
      </div>
    </div>
    <div class="pomodoro-dots" id="pomodoro-dots" style="${timerState.mode === 'pomodoro' ? '' : 'display:none;'}">
      ${[0,1,2,3].map(i => `<div class="pomodoro-dot ${i < timerState.pomodoroCount ? 'completed' : ''}" id="pomo-dot-${i}"></div>`).join('')}
    </div>
    <div class="timer-controls">
      <button class="timer-btn-sub" id="btn-timer-reset" title="リセット">↺</button>
      <button class="timer-btn-main" id="btn-timer-toggle">${timerState.running ? '⏸' : '▶'}</button>
      <button class="timer-btn-sub" id="btn-timer-stop" title="終了して保存">⏹</button>
    </div>
    <div class="text-center mt-lg" style="color:var(--text-secondary);font-size:var(--text-sm);" id="timer-info">
      ${timerState.mode === 'pomodoro' ? `${settings.pomodoroWork}分 集中 → ${settings.pomodoroBreak}分 休憩` : '教材を選んで開始'}
    </div>`;

  if (timerState.running) updateTimerDisplay();
  setupEvents(container, settings, C);
  const hv = () => {
    if (document.hidden) { timerState.hiddenAt = Date.now(); }
    else if (timerState.hiddenAt && timerState.running) {
      const d = Math.floor((Date.now() - timerState.hiddenAt) / 1000);
      if (timerState.mode === 'timer') timerState.elapsed += d;
      else { timerState.remaining = Math.max(0, timerState.remaining - d); if (timerState.remaining <= 0) handlePomodoroComplete(container, settings, C); }
      timerState.hiddenAt = null; updateTimerDisplay();
    }
  };
  document.addEventListener('visibilitychange', hv);
  container._cleanup = () => document.removeEventListener('visibilitychange', hv);
}

function setupEvents(container, settings, C) {
  container.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    if (timerState.running) return;
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); timerState.mode = btn.dataset.mode;
    document.getElementById('pomodoro-dots').style.display = timerState.mode === 'pomodoro' ? 'flex' : 'none';
    document.getElementById('timer-mode-label').textContent = timerState.mode === 'pomodoro' ? 'ポモドーロ — 集中' : 'ストップウォッチ';
    document.getElementById('timer-info').textContent = timerState.mode === 'pomodoro' ? `${settings.pomodoroWork}分 集中 → ${settings.pomodoroBreak}分 休憩` : '教材を選んで開始';
    resetDisplay(C);
  }));
  container.querySelector('#timer-material-select')?.addEventListener('change', e => { timerState.materialId = e.target.value; });
  container.querySelector('#btn-timer-toggle')?.addEventListener('click', () => { timerState.running ? pause() : start(container, settings, C); });
  container.querySelector('#btn-timer-reset')?.addEventListener('click', () => reset(C));
  container.querySelector('#btn-timer-stop')?.addEventListener('click', () => stopSave(container, C));
}

function start(container, settings, C) {
  if (!timerState.materialId) { container.querySelector('#timer-material-select')?.focus(); return; }
  timerState.running = true;
  if (!timerState.startTime) timerState.startTime = new Date().toISOString();
  if (timerState.mode === 'pomodoro' && timerState.remaining <= 0) {
    timerState.pomodoroPhase = 'work'; timerState.remaining = settings.pomodoroWork * 60; timerState.totalDuration = settings.pomodoroWork * 60;
  }
  document.getElementById('timer-display')?.classList.add('timer-running');
  document.getElementById('btn-timer-toggle').textContent = '⏸';
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (timerState.mode === 'timer') timerState.elapsed++;
    else { timerState.remaining--; if (timerState.remaining <= 0) { timerState.remaining = 0; handlePomodoroComplete(container, settings, C); return; } }
    updateTimerDisplay();
  }, 1000);
}

function pause() {
  timerState.running = false; clearInterval(timerInterval);
  document.getElementById('timer-display')?.classList.remove('timer-running');
  document.getElementById('btn-timer-toggle').textContent = '▶';
}

function reset(C) { pause(); timerState.elapsed = 0; timerState.remaining = 0; timerState.startTime = null; timerState.pomodoroPhase = 'work'; resetDisplay(C); }
function resetDisplay(C) { const t = document.getElementById('timer-time'); if(t) t.textContent='00:00'; const r=document.getElementById('timer-ring-progress'); const g=document.getElementById('timer-ring-glow'); if(r) r.style.strokeDashoffset=C; if(g) g.style.strokeDashoffset=C; }

function stopSave(container, C) {
  pause();
  const dur = timerState.mode === 'timer' ? timerState.elapsed : (timerState.totalDuration - timerState.remaining);
  if (dur > 0 && timerState.materialId) showSaveModal(dur, container, C);
  else reset(C);
}

async function showSaveModal(duration, pc, C) {
  const materials = await getMaterials();
  const mat = materials.find(m => m.id === timerState.materialId);
  const ov = document.createElement('div'); ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal-content"><div class="modal-handle"></div><h2 class="modal-title">学習記録を保存</h2>
    <div class="card card-sm mb-lg text-center"><div style="font-size:var(--text-3xl);font-weight:700;background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${formatTimer(duration)}</div><div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:4px;">${mat?mat.title:'教材未選択'}</div></div>
    ${mat&&mat.totalPages>0?`<div class="form-group mb-lg"><label class="form-label">読んだページ数</label><input type="number" class="form-input" id="save-pages-read" placeholder="例: 10" min="0"/></div>`:''}
    <div class="form-group mb-lg"><label class="form-label">メモ（任意）</label><textarea class="form-textarea" id="save-memo" placeholder="学習内容のメモ" rows="2"></textarea></div>
    <div class="flex-col gap-sm"><button class="btn btn-primary btn-block" id="btn-confirm-save">保存する ✓</button><button class="btn btn-ghost btn-block" id="btn-discard">保存せず破棄</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#btn-confirm-save')?.addEventListener('click', async () => {
    const pr = parseInt(ov.querySelector('#save-pages-read')?.value)||0;
    await addLog({ materialId: timerState.materialId, startTime: timerState.startTime||new Date().toISOString(), endTime: new Date().toISOString(), duration, mode: timerState.mode, pagesRead: pr, memo: ov.querySelector('#save-memo')?.value?.trim()||'' });
    if (pr > 0 && mat) { const np = Math.min(mat.currentPage+pr, mat.totalPages); await updateMaterial(mat.id, { currentPage: np, ...(np>=mat.totalPages?{completedAt:new Date().toISOString()}:{}) }); }
    ov.remove(); reset(C);
  });
  ov.querySelector('#btn-discard')?.addEventListener('click', () => { ov.remove(); reset(C); });
  ov.addEventListener('click', e => { if(e.target===ov) ov.remove(); });
}

function updateTimerDisplay() {
  const C = 2*Math.PI*115; const timeEl=document.getElementById('timer-time'); const ring=document.getElementById('timer-ring-progress'); const glow=document.getElementById('timer-ring-glow');
  if (timerState.mode==='timer') { if(timeEl) timeEl.textContent=formatTimer(timerState.elapsed); const p=(timerState.elapsed%1800)/1800; const o=C*(1-p); if(ring) ring.style.strokeDashoffset=o; if(glow) glow.style.strokeDashoffset=o; }
  else { if(timeEl) timeEl.textContent=formatTimer(timerState.remaining); const p=timerState.totalDuration>0?1-(timerState.remaining/timerState.totalDuration):0; const o=C*(1-p); if(ring) ring.style.strokeDashoffset=o; if(glow) glow.style.strokeDashoffset=o; }
}

async function handlePomodoroComplete(container, settings, C) {
  pause(); playSound('complete');
  if (timerState.pomodoroPhase==='work') {
    timerState.pomodoroCount++;
    if (timerState.totalDuration>0&&timerState.materialId) await addLog({ materialId:timerState.materialId, startTime:timerState.startTime||new Date().toISOString(), endTime:new Date().toISOString(), duration:timerState.totalDuration, mode:'pomodoro' });
    for(let i=0;i<4;i++){const d=document.getElementById(`pomo-dot-${i}`);if(d){d.className='pomodoro-dot';if(i<timerState.pomodoroCount%4)d.classList.add('completed');}}
    const lb=timerState.pomodoroCount%4===0; timerState.pomodoroPhase=lb?'longbreak':'break'; const bt=lb?settings.pomodoroLongBreak:settings.pomodoroBreak; timerState.remaining=bt*60; timerState.totalDuration=bt*60; timerState.startTime=new Date().toISOString();
    document.getElementById('timer-mode-label').textContent=lb?'長い休憩タイム ☕':'休憩タイム ☕';
    sendNotification('🍅 ポモドーロ完了！', lb?'長い休憩を取りましょう':'短い休憩を取りましょう');
    start(container, settings, C);
  } else {
    timerState.pomodoroPhase='work'; timerState.remaining=settings.pomodoroWork*60; timerState.totalDuration=settings.pomodoroWork*60; timerState.startTime=null;
    document.getElementById('timer-mode-label').textContent='ポモドーロ — 集中';
    sendNotification('⏱️ 休憩終了！','集中タイムを始めましょう'); resetDisplay(C);
  }
}
