// ============================================
// Log Page (v2 — async Firestore)
// ============================================

import { getLogs, getMaterial, getMaterials, addLog, deleteLog } from '../store.js';
import { formatDuration, formatDateTime, getModeIcon, getModeLabel, getTypeIcon } from '../utils/helpers.js';

export async function renderLog(container) {
  container.innerHTML = `<div class="page-header"><h1 class="page-title">学習ログ</h1></div><div class="text-center" style="color:var(--text-secondary);">読み込み中...</div>`;

  const [logs, materials] = await Promise.all([getLogs(), getMaterials()]);

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div><h1 class="page-title">学習ログ</h1><p class="page-subtitle">${logs.length}件の記録</p></div>
        <button class="btn btn-primary" id="btn-add-log">✏️ 手動入力</button>
      </div>
    </div>
    <div class="flex-col" id="log-list">
      ${logs.length > 0 ? logs.map(log => {
        const mat = materials.find(m => m.id === log.materialId);
        return `
          <div class="log-entry" data-id="${log.id}">
            <div class="log-icon ${log.mode}">${getModeIcon(log.mode)}</div>
            <div class="log-details">
              <div class="log-material">${mat ? mat.title : '不明な教材'}</div>
              <div class="log-time-info">${formatDateTime(log.startTime)} · ${getModeLabel(log.mode)}${log.pagesRead > 0 ? ` · ${log.pagesRead}p` : ''}</div>
              ${log.memo ? `<div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px;">${log.memo}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              <div class="log-duration">${formatDuration(log.duration)}</div>
              <button class="btn btn-ghost" style="font-size:var(--text-xs);padding:2px 8px;" data-delete="${log.id}">削除</button>
            </div>
          </div>`;
      }).join('') : `
        <div class="empty-state"><div class="empty-state-icon">📝</div><p class="empty-state-text">学習記録がありません</p></div>
      `}
    </div>
  `;

  container.querySelector('#btn-add-log')?.addEventListener('click', () => showManualLogModal(materials, container));
  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('この記録を削除しますか？')) { await deleteLog(btn.dataset.delete); renderLog(container); }
    });
  });
}

function showManualLogModal(materials, pageContainer) {
  const ov = document.createElement('div'); ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal-content"><div class="modal-handle"></div><h2 class="modal-title">手動で記録を追加</h2>
    <div class="flex-col gap-lg">
      <div class="form-group"><label class="form-label">教材 *</label><select class="form-select" id="ml-mat"><option value="">-- 教材を選択 --</option>${materials.map(m => `<option value="${m.id}">${getTypeIcon(m.type)} ${m.title}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">日付</label><input type="date" class="form-input" id="ml-date" value="${new Date().toISOString().slice(0,10)}"/></div>
      <div class="grid-2"><div class="form-group"><label class="form-label">時間</label><input type="number" class="form-input" id="ml-hours" value="0" min="0"/></div><div class="form-group"><label class="form-label">分</label><input type="number" class="form-input" id="ml-mins" value="30" min="0" max="59"/></div></div>
      <div class="form-group"><label class="form-label">読んだページ数</label><input type="number" class="form-input" id="ml-pages" placeholder="任意" min="0"/></div>
      <div class="form-group"><label class="form-label">メモ</label><textarea class="form-textarea" id="ml-memo" placeholder="任意" rows="2"></textarea></div>
      <button class="btn btn-primary btn-block" id="btn-save-ml">記録を保存 ✓</button>
    </div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#btn-save-ml')?.addEventListener('click', async () => {
    const matId = ov.querySelector('#ml-mat')?.value;
    if (!matId) { ov.querySelector('#ml-mat')?.focus(); return; }
    const date = ov.querySelector('#ml-date')?.value || new Date().toISOString().slice(0,10);
    const dur = (parseInt(ov.querySelector('#ml-hours')?.value)||0) * 3600 + (parseInt(ov.querySelector('#ml-mins')?.value)||0) * 60;
    if (dur <= 0) return;
    await addLog({ materialId: matId, startTime: `${date}T12:00:00`, endTime: new Date(new Date(`${date}T12:00:00`).getTime()+dur*1000).toISOString(), duration: dur, mode: 'manual', pagesRead: parseInt(ov.querySelector('#ml-pages')?.value)||0, memo: ov.querySelector('#ml-memo')?.value?.trim()||'' });
    ov.remove(); renderLog(pageContainer);
  });
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}
