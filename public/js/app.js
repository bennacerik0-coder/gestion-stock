const API_BASE = '/api/v1';
let currentUser = null;

// ===== API HELPER =====
async function fetchApi(path, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': 'Bearer ' + token }),
    },
    ...options,
  };
  const res = await fetch(API_BASE + path, config);
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erreur serveur' }));
    throw new Error(err.message || 'Request failed');
  }
  if (res.headers.get('content-type') && res.headers.get('content-type').includes('application/json')) {
    return res.json();
  }
  return res;
}

// ===== AUTH CHECK =====
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

async function loadCurrentUser() {
  try {
    const data = await fetchApi('/auth/me');
    currentUser = data.user;
    const usernameEl = document.getElementById('topbar-username');
    if (usernameEl) usernameEl.textContent = currentUser.name;
  } catch (err) {
    console.error('Failed to load user:', err);
  }
}

// ===== THEME =====
function getTheme() {
  return localStorage.getItem('theme') || 'dark';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  updateThemeUI(theme);
}

function toggleTheme() {
  const current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function updateThemeUI(theme) {
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon) icon.textContent = theme === 'dark' ? '\u2600' : '\uD83C\uDF19';
  if (label) label.textContent = theme === 'dark' ? 'Mode clair' : 'Mode sombre';
}

// ===== SIDEBAR =====
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function highlightActivePage() {
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === '/' + page) {
      item.classList.add('active');
    }
  });
}

function setPageTitle() {
  const titles = {
    'dashboard.html': 'Dashboard',
    'products.html': 'Produits',
    'stock-movements.html': 'Mouvements de stock',
    'suppliers.html': 'Fournisseurs',
    'purchase-orders.html': 'Commandes',
    'alerts.html': 'Alertes',
    'settings.html': 'Parametres',
  };
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[page] || 'Gestion-Stock';
  document.title = (titles[page] || 'Gestion-Stock') + ' | Gestion-Stock';
}

// ===== TOAST =====
function showToast(message, type) {
  type = type || 'info';
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/index.html';
}

// ===== MODAL HELPERS =====
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// ===== ALERT BADGE =====
async function updateAlertBadge() {
  try {
    var token = localStorage.getItem('token');
    if (!token) return;
    var res = await fetch(API_BASE + '/alerts/unread-count', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) return;
    var data = await res.json();
    var badge = document.getElementById('alerts-badge');
    var topBadge = document.getElementById('topbar-alerts-badge');
    if (data.count > 0) {
      if (badge) { badge.textContent = data.count; badge.style.display = ''; }
      if (topBadge) { topBadge.textContent = data.count; topBadge.style.display = ''; }
    } else {
      if (badge) badge.style.display = 'none';
      if (topBadge) topBadge.style.display = 'none';
    }
  } catch (err) {}
}

// ===== PAGINATION =====
function renderPagination(containerId, current, total, onPageFn) {
  var container = document.getElementById(containerId);
  if (!container || total <= 1) { if (container) container.innerHTML = ''; return; }
  var html = '';
  html += '<button class="btn btn-secondary btn-sm pagination-btn" ' + (current === 1 ? 'disabled' : '') + ' onclick="' + onPageFn + '(' + (current - 1) + ')">&#9664; Prev</button>';
  var pages = [];
  if (total <= 7) {
    for (var i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (var j = Math.max(2, current - 1); j <= Math.min(total - 1, current + 1); j++) pages.push(j);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }
  pages.forEach(function(p) {
    if (p === '...') {
      html += '<span class="pagination-dots">...</span>';
    } else {
      var cls = p === current ? 'btn-primary' : 'btn-secondary';
      html += '<button class="btn ' + cls + ' btn-sm pagination-btn" onclick="' + onPageFn + '(' + p + ')">' + p + '</button>';
    }
  });
  html += '<button class="btn btn-secondary btn-sm pagination-btn" ' + (current === total ? 'disabled' : '') + ' onclick="' + onPageFn + '(' + (current + 1) + ')">Next &#9654;</button>';
  html += '<span class="pagination-info">Page ' + current + ' sur ' + total + '</span>';
  container.innerHTML = html;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  setTheme(getTheme());
  highlightActivePage();
  setPageTitle();
  if (typeof loadCurrentUser === 'function') loadCurrentUser();
  updateAlertBadge();
  setInterval(updateAlertBadge, 30000);
});
