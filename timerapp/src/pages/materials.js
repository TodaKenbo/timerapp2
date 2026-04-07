// ============================================
// Materials Page (v2 — async Firestore)
// ============================================

import { getMaterials, deleteMaterial, updateMaterial, getMaterialTotalTime } from '../store.js';
import { getTypeIcon, getProgressPercent, formatDuration, estimateCompletionDate } from '../utils/helpers.js';
import { router } from '../router.js';

export async function renderMaterials(container) {
  container.innerHTML = `<div class="page-header"><h1 class="page-title">教材一覧</h1></div><div class="text-center" style="color:var(--text-secondary);">読み込み中...</div>`;

  const materials = await getMaterials();

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div><h1 class="page-title">教材一覧</h1><p class="page-subtitle">${materials.length}件の教材</p></div>
        <button class="btn btn-primary" id="btn-add-material"><span>＋ 追加</span></button>
      </div>
    </div>
    <div class="flex-col gap-md" id="materials-list">
      ${materials.length > 0 ? await renderCards(materials) : `
        <div class="empty-state"><div class="empty-state-icon">📚</div><p class="empty-state-text">教材がまだありません<br>「＋ 追加」から教材を登録しましょう</p></div>
      `}
    </div>
  `;

  container.querySelector('#btn-add-material')?.addEventListener('click', () => router.navigate('/add-material'));

  container.querySelectorAll('.material-card').forEach(card => {
    card.addEventListener('click', () => showMaterialDetailModal(card.dataset.id, container));
  });
}

async function renderCards(materials) {
  let html = '';
  for (const m of materials) {
    const progress = getProgressPercent(m.currentPage, m.totalPages);
    const totalTime = await getMaterialTotalTime(m.id);
    html += `
      <div class="card card-sm material-card" data-id="${m.id}">
        <div class="material-cover">${m.coverUrl ? `<img src="${m.coverUrl}" alt="${m.title}" loading="lazy"/>` : getTypeIcon(m.type)}</div>
        <div class="material-info">
          <div class="material-title">${m.title}</div>
          <div class="material-meta"><span>${getTypeIcon(m.type)} ${m.author || ''}</span>${progress >= 100 ? '<span class="badge badge-success">✓ 完了</span>' : ''}</div>
          ${m.totalPages > 0 ? `<div class="progress-bar" style="margin-top:4px;"><div class="progress-bar-fill" style="width:${progress}%"></div></div><div class="material-progress-text">${m.currentPage}/${m.totalPages}ページ (${progress}%)${totalTime > 0 ? ` · ${formatDuration(totalTime)}` : ''}</div>` : `<div class="material-progress-text">${totalTime > 0 ? `学習${formatDuration(totalTime)}` : '進捗情報なし'}</div>`}
        </div>
      </div>`;
  }
  return html;
}

async function showMaterialDetailModal(id, pageContainer) {
  const materials = await getMaterials();
  const m = materials.find(mat => mat.id === id);
  if (!m) return;
  const progress = getProgressPercent(m.currentPage, m.totalPages);
  const estimation = estimateCompletionDate(m);
  const totalTime = await getMaterialTotalTime(m.id);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content"><div class="modal-handle"></div>
      <div style="display:flex;gap:var(--space-md);margin-bottom:var(--space-lg);">
        <div class="material-cover" style="width:72px;height:104px;">${m.coverUrl ? `<img src="${m.coverUrl}" alt="${m.title}"/>` : `<span style="font-size:32px;">${getTypeIcon(m.type)}</span>`}</div>
        <div style="flex:1;"><h2 style="font-size:var(--text-lg);font-weight:700;margin-bottom:4px;">${m.title}</h2>${m.author ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);">${m.author}</p>` : ''}${totalTime > 0 ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:4px;">累計学習: ${formatDuration(totalTime)}</p>` : ''}</div>
      </div>
      ${m.totalPages > 0 ? `<div class="form-group mb-lg"><label class="form-label">現在のページ (全${m.totalPages}ページ)</label><div style="display:flex;align-items:center;gap:var(--space-sm);"><input type="number" class="form-input" id="edit-current-page" value="${m.currentPage}" min="0" max="${m.totalPages}"/><span style="color:var(--text-secondary);white-space:nowrap;">/ ${m.totalPages}</span></div><div class="progress-bar mt-sm"><div class="progress-bar-fill" id="edit-progress-bar" style="width:${progress}%"></div></div>${estimation ? `<p style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:4px;">完了予定: ${estimation}</p>` : ''}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:var(--space-sm);">
        <button class="btn btn-primary btn-block" id="btn-save-progress">進捗を保存</button>
        <button class="btn btn-secondary btn-block" id="btn-start-timer">この教材で学習開始 ⏱️</button>
        <button class="btn btn-danger btn-block" id="btn-delete-material">教材を削除</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const pageInput = overlay.querySelector('#edit-current-page');
  const progressBar = overlay.querySelector('#edit-progress-bar');
  if (pageInput && progressBar) pageInput.addEventListener('input', () => { progressBar.style.width = `${getProgressPercent(parseInt(pageInput.value) || 0, m.totalPages)}%`; });

  overlay.querySelector('#btn-save-progress')?.addEventListener('click', async () => {
    const np = Math.min(parseInt(pageInput?.value) || 0, m.totalPages);
    await updateMaterial(id, { currentPage: np, ...(np >= m.totalPages ? { completedAt: new Date().toISOString() } : {}) });
    overlay.remove(); renderMaterials(pageContainer);
  });
  overlay.querySelector('#btn-start-timer')?.addEventListener('click', () => { overlay.remove(); sessionStorage.setItem('timer_materialId', id); router.navigate('/timer'); });
  overlay.querySelector('#btn-delete-material')?.addEventListener('click', () => {
    const d = document.createElement('div'); d.className = 'confirm-dialog';
    d.innerHTML = `<div class="confirm-box"><h3>教材を削除しますか？</h3><p>関連する学習ログも全て削除されます。</p><div class="confirm-actions"><button class="btn btn-secondary" id="cc">キャンセル</button><button class="btn btn-danger" id="co">削除</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector('#cc').onclick = () => d.remove();
    d.querySelector('#co').onclick = async () => { await deleteMaterial(id); d.remove(); overlay.remove(); renderMaterials(pageContainer); };
    d.addEventListener('click', e => { if (e.target === d) d.remove(); });
  });
}
