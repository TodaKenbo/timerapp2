// ============================================
// Router — Hash-based SPA Router (v2 — with auth guard)
// ============================================

export class Router {
  constructor() {
    this.routes = {};
    this.currentPage = null;
    this.container = null;
    this.authRequired = true;
    this.isLoggedIn = false;
    window.addEventListener('hashchange', () => this.navigate());
  }

  register(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  setContainer(el) {
    this.container = el;
    return this;
  }

  setAuth(loggedIn) {
    this.isLoggedIn = loggedIn;
  }

  navigate(path) {
    if (path) {
      window.location.hash = path;
      return;
    }

    const hash = window.location.hash.slice(1) || '/dashboard';

    // Auth guard
    if (!this.isLoggedIn && hash !== '/login') {
      window.location.hash = '/login';
      return;
    }
    if (this.isLoggedIn && hash === '/login') {
      window.location.hash = '/dashboard';
      return;
    }

    const handler = this.routes[hash];
    if (handler && this.container) {
      this.currentPage = hash;
      this.container.innerHTML = '';
      const page = document.createElement('div');
      page.className = 'page';
      page.id = `page-${hash.slice(1).replace(/\//g, '-')}`;
      this.container.appendChild(page);

      // Handler may be async
      const result = handler(page);
      if (result && typeof result.catch === 'function') {
        result.catch(err => {
          console.error('Page render error:', err);
          page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">ページの読み込みに失敗しました</p><button class="btn btn-secondary" onclick="location.reload()">リロード</button></div>`;
        });
      }

      this.updateNavbar();
    }
  }

  updateNavbar() {
    document.querySelectorAll('.nav-item').forEach(item => {
      const target = item.dataset.route;
      const isActive = this.currentPage === target ||
        (target && this.currentPage && this.currentPage.startsWith(target) && target !== '/dashboard');
      item.classList.toggle('active', isActive);
    });
  }

  start() {
    this.navigate();
  }
}

export const router = new Router();
