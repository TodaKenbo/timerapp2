// ============================================
// Admin — User Manager
// ============================================

import { createUser, login, logout, getCachedProfile } from '../../auth.js';
import { getAllUsers, getUserById } from '../../store.js';
import { downloadCSV, generatePassword } from '../../utils/csvExport.js';
import { auth } from '../../firebase.js';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { router } from '../../router.js';

export async function renderUserManager(container) {
  const profile = getCachedProfile();
  if (!profile || profile.role !== 'admin') {
    container.innerHTML = '<div class="page"><p style="color:var(--danger);">管理者権限が必要です</p></div>';
    return;
  }

  const users = await getAllUsers();

  container.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:var(--space-md);">
        <button class="btn btn-ghost btn-icon" id="btn-admin-back" style="font-size:20px;">←</button>
        <div>
          <h1 class="page-title">ユーザー管理</h1>
          <p class="page-subtitle">${users.filter(u => u.role !== 'admin').length}名の生徒</p>
        </div>
      </div>
    </div>

    <!-- Batch Create -->
    <div class="card mb-lg" id="batch-create-card">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">ユーザー一括発行</h2>
      <div class="flex-col gap-md">
        <div class="form-group">
          <label class="form-label">クラス名</label>
          <input type="text" class="form-input" id="batch-class" placeholder="例: 3-A" />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">開始番号</label>
            <input type="number" class="form-input" id="batch-start" value="1" min="1" />
          </div>
          <div class="form-group">
            <label class="form-label">終了番号</label>
            <input type="number" class="form-input" id="batch-end" value="40" min="1" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">ID接頭辞</label>
          <input type="text" class="form-input" id="batch-prefix" placeholder="例: 2026" value="2026" />
        </div>
        <div id="batch-preview" style="font-size:var(--text-sm);color:var(--text-secondary);"></div>
        <button class="btn btn-primary btn-block" id="btn-batch-create">一括発行</button>
        <div id="batch-status" style="display:none;" class="text-center"></div>
      </div>
    </div>

    <!-- User List -->
    <div class="card" id="user-list-card">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">登録済みユーザー</h2>
      <div class="flex-col" id="user-list">
        ${users.length > 0 ? users.map(u => `
          <div class="log-entry" data-uid="${u.uid}">
            <div class="log-icon" style="background:${u.role === 'admin' ? 'hsla(260,85%,65%,0.12)' : 'hsla(200,90%,55%,0.12)'};">
              ${u.role === 'admin' ? '👑' : '👤'}
            </div>
            <div class="log-details">
              <div class="log-material">${u.displayName || u.studentId}</div>
              <div class="log-time-info">${u.studentId} · ${u.classId || '未設定'} ${u.role === 'admin' ? '· 管理者' : ''}</div>
            </div>
            ${u.role !== 'admin' ? `<button class="btn btn-ghost" style="font-size:var(--text-xs);padding:2px 8px;" data-reset="${u.uid}">名前リセット</button>` : ''}
          </div>
        `).join('') : '<p style="color:var(--text-secondary);text-align:center;">ユーザーがいません</p>'}
      </div>
    </div>
  `;

  // Back button
  container.querySelector('#btn-admin-back')?.addEventListener('click', () => router.navigate('/admin'));

  // Preview
  const updatePreview = () => {
    const prefix = container.querySelector('#batch-prefix')?.value || '2026';
    const start = parseInt(container.querySelector('#batch-start')?.value) || 1;
    const end = parseInt(container.querySelector('#batch-end')?.value) || 40;
    const cls = container.querySelector('#batch-class')?.value || '';
    const count = Math.max(0, end - start + 1);
    const preview = container.querySelector('#batch-preview');
    if (preview) {
      preview.textContent = `${count}名分のアカウントを作成: ${prefix}-${String(start).padStart(2, '0')} 〜 ${prefix}-${String(end).padStart(2, '0')}${cls ? ` (${cls})` : ''}`;
    }
  };
  ['#batch-prefix', '#batch-start', '#batch-end', '#batch-class'].forEach(sel => {
    container.querySelector(sel)?.addEventListener('input', updatePreview);
  });
  updatePreview();

  // Batch create
  container.querySelector('#btn-batch-create')?.addEventListener('click', async () => {
    const prefix = container.querySelector('#batch-prefix')?.value?.trim() || '2026';
    const start = parseInt(container.querySelector('#batch-start')?.value) || 1;
    const end = parseInt(container.querySelector('#batch-end')?.value) || 40;
    const classId = container.querySelector('#batch-class')?.value?.trim() || '';

    if (end < start) return;
    const count = end - start + 1;

    const btn = container.querySelector('#btn-batch-create');
    const status = container.querySelector('#batch-status');
    btn.disabled = true;
    status.style.display = 'block';

    // Store admin credentials to re-login after creating users
    const adminEmail = auth.currentUser.email;
    // We need admin password - ask for it
    const adminPw = prompt('管理者パスワードを入力してください（ユーザー作成後に再ログインが必要です）');
    if (!adminPw) { btn.disabled = false; status.style.display = 'none'; return; }

    const createdUsers = [];
    let errors = 0;

    for (let i = start; i <= end; i++) {
      const studentId = `${prefix}-${String(i).padStart(2, '0')}`;
      const password = generatePassword(8);
      status.innerHTML = `<span style="color:var(--accent-primary);">作成中... ${i - start + 1}/${count}</span>`;

      try {
        await createUser(studentId, password, { classId, displayName: studentId });
        createdUsers.push({ studentId, password, classId });
      } catch (err) {
        console.error(`Failed to create ${studentId}:`, err);
        if (err.code === 'auth/email-already-in-use') {
          createdUsers.push({ studentId, password: '(既存)', classId });
        } else {
          errors++;
        }
      }
    }

    // Re-login as admin
    try {
      await login(getCachedProfile()?.studentId || 'admin', adminPw);
    } catch {
      status.innerHTML = '<span style="color:var(--warning);">管理者として再ログインしてください</span>';
    }

    status.innerHTML = `<span style="color:var(--success);">✓ ${createdUsers.length}名作成完了${errors > 0 ? ` (${errors}件エラー)` : ''}</span>`;
    btn.disabled = false;

    // CSV download
    if (createdUsers.length > 0) {
      setTimeout(() => {
        downloadCSV(
          ['ログインID', 'パスワード', 'クラス'],
          createdUsers.map(u => [u.studentId, u.password, u.classId]),
          `studytracker_accounts_${classId || 'all'}.csv`
        );
      }, 500);
    }
  });

  // Name reset
  container.querySelectorAll('[data-reset]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.reset;
      const user = users.find(u => u.uid === uid);
      if (!user) return;
      if (confirm(`${user.displayName} の名前をリセットしますか？`)) {
        await updateDoc(doc(db, 'users', uid), { displayName: user.studentId });
        renderUserManager(container);
      }
    });
  });
}
