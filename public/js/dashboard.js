var movementsChart = null;
var categoriesChart = null;

var reasonLabels = { purchase: 'Achat', return: 'Retour', adjustment_up: 'Ajustement +', sale: 'Vente', consumption: 'Consommation', damage: 'Degat', adjustment_down: 'Ajustement -' };

document.addEventListener('DOMContentLoaded', function() {
  if (!checkAuth()) return;
  loadDashboard();
});

async function loadDashboard() {
  await Promise.all([
    loadStats(),
    loadRecentMovements(),
    loadLowStock(),
    loadMovementsChart(),
    loadCategoriesChart(),
  ]);
}

async function loadStats() {
  try {
    var data = await fetchApi('/dashboard/stats');
    document.getElementById('stat-products').textContent = data.totalProducts;
    document.getElementById('stat-value').textContent = data.totalStockValue.toLocaleString('fr-FR') + ' MAD';
    document.getElementById('stat-low').textContent = data.lowStockCount;
    document.getElementById('stat-orders').textContent = data.pendingOrders;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

async function loadRecentMovements() {
  try {
    var data = await fetchApi('/dashboard/recent-movements');
    var container = document.getElementById('recent-movements');
    if (data.movements.length === 0) {
      container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">Aucun mouvement recent</p>';
      return;
    }
    var html = '<table style="width:100%;"><tbody>';
    data.movements.forEach(function(m) {
      var date = new Date(m.movementDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      var typeBadge = m.type === 'entry' ? '<span class="badge badge-success">E</span>' : '<span class="badge badge-danger">S</span>';
      var prodName = m.product ? (typeof m.product === 'object' ? m.product.name : '-') : '-';
      html += '<tr style="border-bottom:1px solid var(--border);">' +
        '<td style="padding:8px 0;width:30px;">' + typeBadge + '</td>' +
        '<td style="padding:8px 0;font-weight:600;">' + prodName + '</td>' +
        '<td style="padding:8px 0;text-align:center;font-weight:700;">' + m.quantity + '</td>' +
        '<td style="padding:8px 0;text-align:right;color:var(--text-secondary);font-size:12px;">' + date + '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    console.error('Recent movements error:', err);
  }
}

async function loadLowStock() {
  try {
    var data = await fetchApi('/dashboard/low-stock');
    var container = document.getElementById('low-stock-list');
    if (data.products.length === 0) {
      container.innerHTML = '<p style="color:var(--success);text-align:center;padding:20px;">Tous les stocks sont OK</p>';
      return;
    }
    var html = '';
    data.products.forEach(function(p) {
      var status = p.stock === 0 ? 'badge-danger' : 'badge-warning';
      var label = p.stock === 0 ? 'Rupture' : 'Stock bas';
      var catName = p.category && typeof p.category === 'object' ? p.category.name : '';
      html += '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<div style="flex:1;"><div style="font-weight:600;">' + escHtml(p.name) + '</div><div style="font-size:12px;color:var(--text-secondary);">' + escHtml(catName) + '</div></div>' +
        '<div style="text-align:center;"><span style="font-weight:700;font-size:16px;">' + p.stock + '</span><span style="color:var(--text-muted);font-size:12px;">/' + p.minStock + '</span></div>' +
        '<span class="badge ' + status + '">' + label + '</span>' +
      '</div>';
    });
    container.innerHTML = html;
  } catch (err) {
    console.error('Low stock error:', err);
  }
}

async function loadMovementsChart() {
  try {
    var data = await fetchApi('/dashboard/movements-by-day');
    var labels = data.data.map(function(d) { return d.date.slice(5); });
    var entryData = data.data.map(function(d) { return d.entryQty; });
    var exitData = data.data.map(function(d) { return d.exitQty; });

    var ctx = document.getElementById('chart-movements').getContext('2d');
    if (movementsChart) movementsChart.destroy();

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    var textColor = isDark ? '#94a3b8' : '#64748b';

    movementsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Entrees', data: entryData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.3 },
          { label: 'Sorties', data: exitData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3 },
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
        }
      }
    });
  } catch (err) {
    console.error('Movements chart error:', err);
  }
}

async function loadCategoriesChart() {
  try {
    var data = await fetchApi('/dashboard/stock-by-category');
    var labels = data.categories.map(function(c) { return c._id || 'Sans categorie'; });
    var values = data.categories.map(function(c) { return c.totalValue; });
    var colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

    var ctx = document.getElementById('chart-categories').getContext('2d');
    if (categoriesChart) categoriesChart.destroy();

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var textColor = isDark ? '#94a3b8' : '#64748b';

    categoriesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { color: textColor, padding: 12 } },
        }
      }
    });
  } catch (err) {
    console.error('Categories chart error:', err);
  }
}

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
