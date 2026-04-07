// ============================================
// Login Page
// ============================================

import { login } from '../auth.js';
import { router } from '../router.js';

export function renderLogin(container) {
  container.classList.add('login-page');

  container.innerHTML = `
    <div class="login-container">
      <div class="login-logo">
        <div class="login-logo-icon">📚</div>
        <h1 class="login-title">StudyTracker</h1>
        <p class="login-subtitle">勉強時間記録アプリ</p>
      </div>

      <div class="card login-card">
        <div class="flex-col gap-lg">
          <div class="form-group">
            <label class="form-label">ログインID</label>
            <input type="text" class="form-input" id="login-id" placeholder="例: 2026-01" autocomplete="username" autocapitalize="off" />
          </div>
          <div class="form-group">
            <label class="form-label">パスワード</label>
            <input type="password" class="form-input" id="login-password" placeholder="パスワード" autocomplete="current-password" />
          </div>
          <div id="login-error" style="display:none;color:var(--danger);font-size:var(--text-sm);text-align:center;"></div>
          <button class="btn btn-primary btn-block btn-lg" id="btn-login">
            ログイン
          </button>
        </div>
      </div>

      <p class="login-footer">
        IDとパスワードは管理者から配布されます
      </p>
    </div>
  `;

  const idInput = container.querySelector('#login-id');
  const pwInput = container.querySelector('#login-password');
  const btnLogin = container.querySelector('#btn-login');
  const errorEl = container.querySelector('#login-error');

  async function doLogin() {
    const studentId = idInput.value.trim();
    const password = pwInput.value;

    if (!studentId || !password) {
      showError('IDとパスワードを入力してください');
      return;
    }

    btnLogin.textContent = 'ログイン中...';
    btnLogin.disabled = true;
    errorEl.style.display = 'none';

    try {
      await login(studentId, password);
      // Auth state change will trigger redirect
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        showError('IDまたはパスワードが正しくありません');
      } else if (err.code === 'auth/wrong-password') {
        showError('パスワードが正しくありません');
      } else if (err.code === 'auth/too-many-requests') {
        showError('ログイン試行が多すぎます。しばらくお待ちください');
      } else {
        showError('ログインに失敗しました');
      }
      btnLogin.textContent = 'ログイン';
      btnLogin.disabled = false;
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    errorEl.animate([
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(0)' },
    ], { duration: 300 });
  }

  btnLogin.addEventListener('click', doLogin);
  pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  idInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') pwInput.focus(); });

  // Focus ID input
  requestAnimationFrame(() => idInput.focus());
}
