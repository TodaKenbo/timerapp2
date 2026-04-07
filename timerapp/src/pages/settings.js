// ============================================
// Settings Page
// ============================================

import { getCachedProfile, updateUserProfile, changePassword, logout, getCurrentUid } from '../auth.js';
import { getSettings, updateSettings } from '../store.js';
import { router } from '../router.js';

export function renderSettings(container) {
  const profile = getCachedProfile();
  const settings = getSettings();
  if (!profile) return;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">マイ設定</h1>
      <p class="page-subtitle">${profile.studentId}${profile.classId ? ` · ${profile.classId}` : ''}</p>
    </div>

    <!-- Profile -->
    <div class="card mb-lg">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">プロフィール</h2>
      <div class="flex-col gap-md">
        <div class="form-group">
          <label class="form-label">表示名</label>
          <input type="text" class="form-input" id="settings-name" value="${profile.displayName || ''}" placeholder="ニックネーム" />
        </div>
        <button class="btn btn-secondary btn-block" id="btn-save-name">名前を変更</button>
      </div>
    </div>

    <!-- Password -->
    <div class="card mb-lg">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">パスワード変更</h2>
      <div class="flex-col gap-md">
        <div class="form-group">
          <label class="form-label">現在のパスワード</label>
          <input type="password" class="form-input" id="settings-current-pw" />
        </div>
        <div class="form-group">
          <label class="form-label">新しいパスワード</label>
          <input type="password" class="form-input" id="settings-new-pw" placeholder="8文字以上" />
        </div>
        <div id="pw-error" style="display:none;color:var(--danger);font-size:var(--text-sm);"></div>
        <div id="pw-success" style="display:none;color:var(--success);font-size:var(--text-sm);"></div>
        <button class="btn btn-secondary btn-block" id="btn-change-pw">パスワード変更</button>
      </div>
    </div>

    <!-- Timer Settings -->
    <div class="card mb-lg">
      <h2 style="font-size:var(--text-lg);font-weight:600;margin-bottom:var(--space-md);">ポモドーロ設定</h2>
      <div class="flex-col gap-md">
        <div class="grid-3">
          <div class="form-group">
            <label class="form-label">集中(分)</label>
            <input type="number" class="form-input" id="set-pomo-work" value="${settings.pomodoroWork}" min="1" max="120" />
          </div>
          <div class="form-group">
            <label class="form-label">休憩(分)</label>
            <input type="number" class="form-input" id="set-pomo-break" value="${settings.pomodoroBreak}" min="1" max="30" />
          </div>
          <div class="form-group">
            <label class="form-label">長休憩</label>
            <input type="number" class="form-input" id="set-pomo-long" value="${settings.pomodoroLongBreak}" min="1" max="60" />
          </div>
        </div>
        <button class="btn btn-secondary btn-block" id="btn-save-pomo">保存</button>
      </div>
    </div>

    <!-- Logout -->
    <button class="btn btn-danger btn-block btn-lg" id="btn-logout">ログアウト</button>

    ${profile.role === 'admin' ? `
      <button class="btn btn-secondary btn-block mt-lg" id="btn-goto-admin" style="margin-top:var(--space-md);">
        👑 管理者パネル
      </button>
    ` : ''}
  `;

  // Save display name
  container.querySelector('#btn-save-name')?.addEventListener('click', async () => {
    const name = container.querySelector('#settings-name')?.value?.trim();
    if (!name) return;
    await updateUserProfile(getCurrentUid(), { displayName: name });
    const btn = container.querySelector('#btn-save-name');
    if (btn) { btn.textContent = '✓ 保存しました'; setTimeout(() => { btn.textContent = '名前を変更'; }, 2000); }
  });

  // Change password
  container.querySelector('#btn-change-pw')?.addEventListener('click', async () => {
    const current = container.querySelector('#settings-current-pw')?.value;
    const newPw = container.querySelector('#settings-new-pw')?.value;
    const errEl = container.querySelector('#pw-error');
    const sucEl = container.querySelector('#pw-success');
    errEl.style.display = 'none';
    sucEl.style.display = 'none';

    if (!current || !newPw) { errEl.textContent = 'パスワードを入力してください'; errEl.style.display = 'block'; return; }
    if (newPw.length < 6) { errEl.textContent = '新しいパスワードは6文字以上にしてください'; errEl.style.display = 'block'; return; }

    try {
      await changePassword(current, newPw);
      sucEl.textContent = '✓ パスワードを変更しました';
      sucEl.style.display = 'block';
      container.querySelector('#settings-current-pw').value = '';
      container.querySelector('#settings-new-pw').value = '';
    } catch (err) {
      errEl.textContent = err.code === 'auth/wrong-password' ? '現在のパスワードが正しくありません' : 'パスワード変更に失敗しました';
      errEl.style.display = 'block';
    }
  });

  // Save pomodoro settings
  container.querySelector('#btn-save-pomo')?.addEventListener('click', () => {
    updateSettings({
      pomodoroWork: parseInt(container.querySelector('#set-pomo-work')?.value) || 25,
      pomodoroBreak: parseInt(container.querySelector('#set-pomo-break')?.value) || 5,
      pomodoroLongBreak: parseInt(container.querySelector('#set-pomo-long')?.value) || 15,
    });
    const btn = container.querySelector('#btn-save-pomo');
    if (btn) { btn.textContent = '✓ 保存しました'; setTimeout(() => { btn.textContent = '保存'; }, 2000); }
  });

  // Logout
  container.querySelector('#btn-logout')?.addEventListener('click', async () => {
    if (confirm('ログアウトしますか？')) {
      await logout();
    }
  });

  // Admin panel
  container.querySelector('#btn-goto-admin')?.addEventListener('click', () => router.navigate('/admin'));
}
