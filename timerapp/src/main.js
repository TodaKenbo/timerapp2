// ============================================
// Main Entry Point (v2 — with Firebase Auth)
// ============================================

import './style.css';
import { router } from './router.js';
import { renderNavbar, updateNavbarContent } from './components/navbar.js';
import { onAuthChange } from './auth.js';

// Pages
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderMaterials } from './pages/materials.js';
import { renderAddMaterial } from './pages/addMaterial.js';
import { renderTimer } from './pages/timer.js';
import { renderLog } from './pages/log.js';
import { renderClassStats } from './pages/classStats.js';
import { renderSettings } from './pages/settings.js';
import { renderAdminDashboard } from './pages/admin/adminDashboard.js';
import { renderUserManager } from './pages/admin/userManager.js';
import { renderAnnouncements } from './pages/admin/announcements.js';

let initialized = false;

function initApp() {
  if (initialized) return;
  initialized = true;

  const app = document.getElementById('app');

  // Listen for auth state changes
  onAuthChange(({ user, profile }) => {
    if (user && profile) {
      // Logged in
      showAuthenticatedApp(app);
      router.setAuth(true);
      updateNavbarContent(null);
      router.navigate();
    } else {
      // Not logged in
      showLoginScreen(app);
    }
  });
}

function showLoginScreen(app) {
  app.innerHTML = '';
  const pageContainer = document.createElement('main');
  pageContainer.id = 'page-container';
  app.appendChild(pageContainer);

  router.setContainer(pageContainer);
  router.setAuth(false);
  router.register('/login', renderLogin);
  window.location.hash = '/login';
  router.navigate();
}

function showAuthenticatedApp(app) {
  app.innerHTML = '';

  // Page container
  const pageContainer = document.createElement('main');
  pageContainer.id = 'page-container';
  app.appendChild(pageContainer);

  // Navbar
  const navbar = renderNavbar();
  app.appendChild(navbar);

  // Register all routes
  router
    .setContainer(pageContainer)
    .register('/login', renderLogin)
    .register('/dashboard', renderDashboard)
    .register('/materials', renderMaterials)
    .register('/add-material', renderAddMaterial)
    .register('/timer', renderTimer)
    .register('/log', renderLog)
    .register('/class-stats', renderClassStats)
    .register('/settings', renderSettings)
    .register('/admin', renderAdminDashboard)
    .register('/admin/users', renderUserManager)
    .register('/admin/announcements', renderAnnouncements);
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Boot
document.addEventListener('DOMContentLoaded', initApp);
if (document.readyState !== 'loading') initApp();
