// ============================================
// Admin — Announcements Manager
// ============================================

import { getCachedProfile } from '../../auth.js';
import { getAnnouncements, addAnnouncement, deleteAnnouncement } from '../../store.js';
import { formatDateTime } from '../../utils/helpers.js';
import { router } from '../../router.js';

export async function renderAnnouncements(container) {
  const profile = getCachedProfile();
  if (!profile || profile.role !== 'admin') {
    container.innerHTML = '<p style="color:var(--danger);">管理者権限が必要です</p>';
    return;
  }

  const announcements = await getAnnouncements();

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:var(--space-md);">
        <button class="btn btn-ghost btn-icon" id="btn-ann-back" style="font-size:20px;">←</button>
        <h1 class="page-title">お知らせ管理</h1>
      </div>
    </div>

    <!-- Create Form -->
    <div class="card mb-lg">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">新しいお知らせ</h2>
      <div class="flex-col gap-md">
        <div class="form-group">
          <label class="form-label">タイトル *</label>
          <input type="text" class="form-input" id="ann-title" placeholder="例: 定期テストまであと3日！" />
        </div>
        <div class="form-group">
          <label class="form-label">本文</label>
          <textarea class="form-textarea" id="ann-body" placeholder="詳細メッセージ (任意)" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">表示期限</label>
          <input type="date" class="form-input" id="ann-expires" />
        </div>
        <button class="btn btn-primary btn-block" id="btn-add-ann">配信する 📢</button>
      </div>
    </div>

    <!-- Announcements List -->
    <div class="card">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">配信中のお知らせ</h2>
      <div class="flex-col" id="ann-list">
        ${announcements.length > 0 ? announcements.map(a => `
          <div class="log-entry" data-id="${a.id}">
            <div class="log-icon" style="background:hsla(40,90%,55%,0.12);">📢</div>
            <div class="log-details">
              <div class="log-material">${a.title}</div>
              <div class="log-time-info">${a.body || ''}${a.expiresAt ? ` · 期限: ${a.expiresAt}` : ''}</div>
            </div>
            <button class="btn btn-ghost" style="font-size:var(--text-xs);padding:2px 8px;color:var(--danger);" data-del="${a.id}">削除</button>
          </div>
        `).join('') : '<p style="color:var(--text-secondary);text-align:center;">お知らせはありません</p>'}
      </div>
    </div>
  `;

  container.querySelector('#btn-ann-back')?.addEventListener('click', () => router.navigate('/admin'));

  container.querySelector('#btn-add-ann')?.addEventListener('click', async () => {
    const title = container.querySelector('#ann-title')?.value?.trim();
    if (!title) { container.querySelector('#ann-title')?.focus(); return; }
    const body = container.querySelector('#ann-body')?.value?.trim() || '';
    const expiresAt = container.querySelector('#ann-expires')?.value || null;

    await addAnnouncement({ title, body, expiresAt });
    renderAnnouncements(container);
  });

  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('このお知らせを削除しますか？')) {
        await deleteAnnouncement(btn.dataset.del);
        renderAnnouncements(container);
      }
    });
  });
}
