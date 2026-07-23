var roleLabels = { admin: 'Admin', manager: 'Manager', operator: 'Operateur' };
var entityLabels = { product: 'Produit', stock_movement: 'Mouvement', purchase_order: 'Commande', settings: 'Parametres', database: 'Base de donnees', category: 'Categorie', supplier: 'Fournisseur', user: 'Utilisateur' };
var actionLabels = { create: 'Creation', update: 'Modification', delete: 'Suppression', login: 'Connexion', export: 'Export', backup: 'Sauvegarde', receive: 'Reception', status_change: 'Changement statut' };
var actionBadgeClass = { create: 'badge-success', update: 'badge-info', delete: 'badge-danger', login: 'badge-secondary', export: 'badge-secondary', backup: 'badge-warning', receive: 'badge-success', status_change: 'badge-warning' };

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
  document.querySelector('[data-tab="' + tab + '"]').classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'users') loadUsers();
  if (tab === 'company') loadCompany();
  if (tab === 'defaults') loadDefaults();
  if (tab === 'activity') loadLogs();
}

// ===== PROFILE =====
function loadProfile() {
  if (!currentUser) return;
  document.getElementById('profile-name').value = currentUser.name || '';
  document.getElementById('profile-email').value = currentUser.email || '';
  document.getElementById('profile-role').value = roleLabels[currentUser.role] || currentUser.role;
}

function updateProfile(e) {
  e.preventDefault();
  fetchApi('/auth/me', { method: 'PUT', body: JSON.stringify({ name: document.getElementById('profile-name').value.trim() }) })
    .then(function() { showToast('Profil mis a jour', 'success'); loadCurrentUser(); })
    .catch(function(err) { showToast(err.message, 'error'); });
  return false;
}

function changePassword(e) {
  e.preventDefault();
  var newPw = document.getElementById('pw-new').value;
  var confirm = document.getElementById('pw-confirm').value;
  if (newPw !== confirm) { showToast('Les mots de passe ne correspondent pas', 'error'); return false; }
  fetchApi('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword: document.getElementById('pw-current').value, newPassword: newPw })
  }).then(function() {
    showToast('Mot de passe modifie', 'success');
    document.getElementById('form-password').reset();
  }).catch(function(err) { showToast(err.message, 'error'); });
  return false;
}

// ===== USERS =====
function loadUsers() {
  var search = document.getElementById('search-users').value || '';
  fetchApi('/users?search=' + encodeURIComponent(search))
    .then(function(data) {
      var tbody = document.getElementById('users-table');
      if (!data.users.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">Aucun utilisateur</td></tr>'; return; }
      tbody.innerHTML = data.users.map(function(u) {
        var statusBadge = u.isActive ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-danger">Inactif</span>';
        var lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : '-';
        var actions = '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-secondary btn-sm" onclick="editUser(\'' + u._id + '\')" title="Modifier">&#9998;</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="openResetModal(\'' + u._id + '\')" title="Reset mot de passe">&#128273;</button>' +
          '<button class="btn btn-danger btn-sm" onclick="deleteUser(\'' + u._id + '\')" title="Supprimer">&#128465;</button></div>';
        return '<tr><td>' + escHtml(u.name) + '</td><td>' + escHtml(u.email) + '</td><td><span class="badge badge-info">' + (roleLabels[u.role] || u.role) + '</span></td><td>' + statusBadge + '</td><td>' + lastLogin + '</td><td>' + actions + '</td></tr>';
      }).join('');
    }).catch(function(err) { showToast(err.message, 'error'); });
}

function openUserModal(user) {
  document.getElementById('user-id').value = '';
  document.getElementById('user-name').value = '';
  document.getElementById('user-email').value = '';
  document.getElementById('user-password').value = '';
  document.getElementById('user-role').value = 'operator';
  document.getElementById('user-active').value = 'true';
  document.getElementById('user-modal-title').textContent = 'Ajouter un utilisateur';
  document.getElementById('pw-group').style.display = '';
  document.getElementById('user-password').required = true;
  if (user) {
    document.getElementById('user-id').value = user._id;
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-role').value = user.role;
    document.getElementById('user-active').value = String(user.isActive);
    document.getElementById('user-modal-title').textContent = 'Modifier un utilisateur';
    document.getElementById('pw-group').style.display = 'none';
    document.getElementById('user-password').required = false;
  }
  openModal('modal-user');
}

function editUser(id) {
  fetchApi('/users?search=')
    .then(function(data) {
      var user = data.users.find(function(u) { return u._id === id; });
      if (user) openUserModal(user);
    });
}

function saveUser() {
  var id = document.getElementById('user-id').value;
  var payload = {
    name: document.getElementById('user-name').value.trim(),
    email: document.getElementById('user-email').value.trim(),
    role: document.getElementById('user-role').value,
    isActive: document.getElementById('user-active').value === 'true'
  };
  var pw = document.getElementById('user-password').value;
  if (!id && pw) payload.password = pw;
  if (!payload.name || !payload.email) { showToast('Nom et email requis', 'error'); return; }
  if (!id && !pw) { showToast('Mot de passe requis', 'error'); return; }
  var method = id ? 'PUT' : 'POST';
  var url = id ? '/users/' + id : '/users';
  fetchApi(url, { method: method, body: JSON.stringify(payload) })
    .then(function() { showToast(id ? 'Utilisateur modifie' : 'Utilisateur cree', 'success'); closeModal('modal-user'); loadUsers(); })
    .catch(function(err) { showToast(err.message, 'error'); });
}

function deleteUser(id) {
  if (!confirm('Supprimer cet utilisateur ?')) return;
  fetchApi('/users/' + id, { method: 'DELETE' })
    .then(function() { showToast('Utilisateur supprime', 'success'); loadUsers(); })
    .catch(function(err) { showToast(err.message, 'error'); });
}

function openResetModal(id) {
  document.getElementById('reset-user-id').value = id;
  document.getElementById('reset-new-pw').value = '';
  openModal('modal-reset-pw');
}

function saveResetPassword() {
  var id = document.getElementById('reset-user-id').value;
  var pw = document.getElementById('reset-new-pw').value;
  if (!pw || pw.length < 6) { showToast('Le mot de passe doit faire au moins 6 caracteres', 'error'); return; }
  fetchApi('/users/' + id + '/reset-password', { method: 'PUT', body: JSON.stringify({ newPassword: pw }) })
    .then(function() { showToast('Mot de passe reinitialise', 'success'); closeModal('modal-reset-pw'); })
    .catch(function(err) { showToast(err.message, 'error'); });
}

// ===== COMPANY =====
function loadCompany() {
  fetchApi('/settings').then(function(data) {
    var c = data.settings.company;
    document.getElementById('company-name').value = c.name || '';
    document.getElementById('company-address').value = c.address || '';
    document.getElementById('company-phone').value = c.phone || '';
    document.getElementById('company-email').value = c.email || '';
    document.getElementById('company-rc').value = c.rc || '';
    document.getElementById('company-ice').value = c.ice || '';
    document.getElementById('company-patent').value = c.patent || '';
    document.getElementById('company-logo').value = c.logo || '';
    updateLogoPreview();
  }).catch(function(err) { showToast(err.message, 'error'); });
}

function updateLogoPreview() {
  var url = document.getElementById('company-logo').value;
  var preview = document.getElementById('logo-preview');
  if (url) {
    preview.innerHTML = '<img src="' + escHtml(url) + '" style="max-height:60px;max-width:200px;border-radius:8px;border:1px solid var(--border);" onerror="this.style.display=\'none\'">';
  } else {
    preview.innerHTML = '';
  }
}

function saveCompany(e) {
  e.preventDefault();
  var body = {
    name: document.getElementById('company-name').value.trim(),
    address: document.getElementById('company-address').value.trim(),
    phone: document.getElementById('company-phone').value.trim(),
    email: document.getElementById('company-email').value.trim(),
    rc: document.getElementById('company-rc').value.trim(),
    ice: document.getElementById('company-ice').value.trim(),
    patent: document.getElementById('company-patent').value.trim(),
    logo: document.getElementById('company-logo').value.trim()
  };
  fetchApi('/settings/company', { method: 'PUT', body: JSON.stringify(body) })
    .then(function() { showToast('Informations entreprise sauvegardees', 'success'); })
    .catch(function(err) { showToast(err.message, 'error'); });
  return false;
}

// ===== DEFAULTS =====
function loadDefaults() {
  fetchApi('/settings').then(function(data) {
    var d = data.settings.defaults;
    document.getElementById('def-min-stock').value = d.minStock || 10;
    document.getElementById('def-max-stock').value = d.maxStock || 100;
    document.getElementById('def-currency').value = d.currency || 'MAD';
    document.getElementById('def-currency-symbol').value = d.currencySymbol || 'MAD';
  }).catch(function(err) { showToast(err.message, 'error'); });
}

function saveDefaults(e) {
  e.preventDefault();
  var body = {
    minStock: parseInt(document.getElementById('def-min-stock').value) || 10,
    maxStock: parseInt(document.getElementById('def-max-stock').value) || 100,
    currency: document.getElementById('def-currency').value,
    currencySymbol: document.getElementById('def-currency-symbol').value.trim() || 'MAD'
  };
  fetchApi('/settings/defaults', { method: 'PUT', body: JSON.stringify(body) })
    .then(function() { showToast('Parametres par defaut sauvegardes', 'success'); })
    .catch(function(err) { showToast(err.message, 'error'); });
  return false;
}

// ===== BACKUP =====
function downloadBackup() {
  var token = localStorage.getItem('token');
  window.open('/api/v1/settings/backup?token=' + token, '_blank');
  showToast('Sauvegarde en cours de telechargement...', 'info');
}

// ===== ACTIVITY LOG =====
function loadLogs(page) {
  page = page || 1;
  var search = document.getElementById('search-logs').value || '';
  var entity = document.getElementById('filter-log-entity').value;
  var action = document.getElementById('filter-log-action').value;
  var url = '/audit-logs?page=' + page + '&limit=20';
  if (search) url += '&search=' + encodeURIComponent(search);
  if (entity) url += '&entity=' + entity;
  if (action) url += '&action=' + action;
  fetchApi(url).then(function(data) {
    var tbody = document.getElementById('logs-table');
    if (!data.logs.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Aucune activite</td></tr>'; document.getElementById('logs-pagination').innerHTML = ''; return; }
    tbody.innerHTML = data.logs.map(function(log) {
      var date = new Date(log.createdAt).toLocaleString('fr-FR');
      var badge = actionBadgeClass[log.action] || 'badge-secondary';
      return '<tr><td style="white-space:nowrap;">' + date + '</td><td>' + escHtml(log.userName) + '</td><td><span class="badge ' + badge + '">' + (actionLabels[log.action] || log.action) + '</span></td><td>' + (entityLabels[log.entity] || log.entity) + '</td><td style="color:var(--text-secondary);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(log.details) + '</td></tr>';
    }).join('');
    renderPaginationWidget('logs-pagination', data.page, data.pages, 'loadLogs');
  }).catch(function(err) { showToast(err.message, 'error'); });
}

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    loadProfile();
    if (currentUser && currentUser.role === 'admin') {
      document.getElementById('tab-users').style.display = '';
      document.getElementById('tab-activity').style.display = '';
    }
    document.getElementById('company-logo').addEventListener('input', updateLogoPreview);
  }, 200);
});
