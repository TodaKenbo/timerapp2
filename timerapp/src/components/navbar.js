// ============================================
// Navbar Component (v2 — with admin tab)
// ============================================

import { router } from '../router.js';
import { getCachedProfile } from '../auth.js';

export function renderNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'main-navbar';
  updateNavbarContent(nav);
  return nav;
}

export function updateNavbarContent(nav) {
  if (!nav) nav = document.getElementById('main-navbar');
  if (!nav) return;

  const profile = getCachedProfile();
  const isAdmin = profile?.role === 'admin';

  const items = [
    { route: '/dashboard', icon: '🏠', label: 'ホーム' },
    { route: '/materials', icon: '📷', label: 'スキャン' },
    { route: '/class-stats', icon: '📊', label: '統計' },
    { route: '/settings', icon: '⚙️', label: '設定' },
  ];

  if (isAdmin) {
    items.push({ route: '/admin', icon: '👑', label: '管理' });
  }

  nav.innerHTML = `
    <div class="navbar-inner" style="${isAdmin ? 'max-width:540px;' : ''}">
      ${items.map(item => `
        <button class="nav-item" data-route="${item.route}" id="nav-${item.route.slice(1)}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `).join('')}
    </div>
  `;

  nav.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      router.navigate(btn.dataset.route);
    });
  });

  router.updateNavbar();
}
