var severityLabels = { critical: 'Critique', warning: 'Avertissement', info: 'Information' };
var typeLabels = { low_stock: 'Stock bas', overstock: 'Sureffectif', expiry: 'Peremption', custom: 'Personnalisee' };

document.addEventListener('DOMContentLoaded', function() {
  if (!checkAuth()) return;
  loadAlerts();
});

async function loadAlerts(page) {
  page = page || 1;
  try {
    var severity = document.getElementById('filter-severity').value;
    var isRead = document.getElementById('filter-read').value;
    var url = '/alerts?page=' + page + '&limit=20';
    if (severity) url += '&severity=' + severity;
    if (isRead !== '') url += '&isRead=' + isRead;

    var data = await fetchApi(url);
    renderAlertsTable(data.alerts);
  } catch (err) {
    console.error('Error loading alerts:', err);
  }
}

function renderAlertsTable(alerts) {
  var tbody = document.getElementById('alerts-table-body');
  if (alerts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-secondary);">Aucune alerte</td></tr>';
    return;
  }
  var html = '';
  alerts.forEach(function(a) {
    var date = new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var sevBadge = a.severity === 'critical' ? 'badge-danger' : a.severity === 'warning' ? 'badge-warning' : 'badge-info';
    var prodName = a.product ? (typeof a.product === 'object' ? a.product.name : '-') : '-';
    var readStatus = a.isRead ? '<span class="badge badge-secondary">Lu</span>' : '<span class="badge badge-warning">Non lu</span>';

    html += '<tr style="' + (!a.isRead ? 'background:var(--accent-light);' : '') + '">' +
      '<td><span class="badge ' + sevBadge + '">' + (severityLabels[a.severity] || a.severity) + '</span></td>' +
      '<td>' + (typeLabels[a.type] || a.type) + '</td>' +
      '<td style="font-weight:600;">' + escHtml(a.message) + '</td>' +
      '<td>' + escHtml(prodName) + '</td>' +
      '<td style="color:var(--text-secondary);">' + date + '</td>' +
      '<td>' + readStatus + '</td>' +
      '<td>' +
        (!a.isRead ? '<button class="btn btn-secondary btn-sm" onclick="markRead(\'' + a._id + '\')" style="padding:4px 8px;font-size:11px;">Marquer lu</button> ' : '') +
        '<button class="btn btn-danger btn-sm" onclick="deleteAlert(\'' + a._id + '\')" style="padding:4px 8px;font-size:11px;">Supprimer</button>' +
      '</td>' +
    '</tr>';
  });
  tbody.innerHTML = html;
}

async function markRead(id) {
  try {
    await fetchApi('/alerts/' + id + '/read', { method: 'PUT' });
    loadAlerts();
    updateBadge();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function markAllRead() {
  try {
    await fetchApi('/alerts/read-all', { method: 'PUT' });
    showToast('Toutes les alertes marques comme lues', 'success');
    loadAlerts();
    updateBadge();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteAlert(id) {
  try {
    await fetchApi('/alerts/' + id, { method: 'DELETE' });
    loadAlerts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateBadge() {
  try {
    var data = await fetchApi('/alerts/unread-count');
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

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
