let allProducts = [];
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', function() {
  if (!checkAuth()) return;
  loadProductsForSelect();
  loadMovements();
  loadSummary();
});

async function loadProductsForSelect() {
  try {
    var data = await fetchApi('/products?limit=500');
    allProducts = data.products;
    var select = document.getElementById('movement-product');
    select.innerHTML = '<option value="">Selectionner un produit...</option>';
    allProducts.forEach(function(p) {
      select.innerHTML += '<option value="' + p._id + '" data-stock="' + p.stock + '" data-unit="' + p.unit + '" data-buying="' + p.buyingPrice + '" data-selling="' + p.sellingPrice + '">' + p.name + ' (' + p.sku + ') - Stock: ' + p.stock + ' ' + p.unit + '</option>';
    });
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function openMovementModal(type) {
  document.getElementById('movement-type').value = type;
  document.getElementById('movement-modal-title').textContent = type === 'entry' ? 'Nouvelle entree de stock' : 'Nouvelle sortie de stock';
  document.getElementById('movement-product').value = '';
  document.getElementById('movement-quantity').value = '';
  document.getElementById('movement-unit-price').value = '';
  document.getElementById('movement-reference').value = '';
  document.getElementById('movement-notes').value = '';
  document.getElementById('movement-current-stock').textContent = '';
  document.getElementById('movement-total').textContent = '0.00 MAD';

  document.getElementById('reasons-entry').style.display = type === 'entry' ? '' : 'none';
  document.getElementById('reasons-exit').style.display = type === 'exit' ? '' : 'none';

  var reasonSelect = document.getElementById('movement-reason');
  if (type === 'entry') {
    reasonSelect.value = 'purchase';
  } else {
    reasonSelect.value = 'sale';
  }

  openModal('movement-modal');
}

function onMovementProductChange() {
  var select = document.getElementById('movement-product');
  var opt = select.options[select.selectedIndex];
  if (!opt.value) {
    document.getElementById('movement-current-stock').textContent = '';
    return;
  }
  var stock = opt.getAttribute('data-stock');
  var unit = opt.getAttribute('data-unit');
  document.getElementById('movement-current-stock').innerHTML = 'Stock actuel: <strong>' + stock + ' ' + unit + '</strong>';
  document.getElementById('movement-unit-price').value = opt.getAttribute('data-buying');
  updateMovementTotal();
}

function updateMovementTotal() {
  var qty = parseFloat(document.getElementById('movement-quantity').value) || 0;
  var price = parseFloat(document.getElementById('movement-unit-price').value) || 0;
  document.getElementById('movement-total').textContent = (qty * price).toFixed(2) + ' MAD';
}

var reasonLabels = {
  purchase: 'Achat', return: 'Retour', adjustment_up: 'Ajustement +',
  sale: 'Vente', consumption: 'Consommation', damage: 'Degat', adjustment_down: 'Ajustement -'
};

async function saveMovement() {
  var type = document.getElementById('movement-type').value;
  var productId = document.getElementById('movement-product').value;
  var reason = document.getElementById('movement-reason').value;
  var quantity = parseInt(document.getElementById('movement-quantity').value);
  var unitPrice = parseFloat(document.getElementById('movement-unit-price').value);
  var reference = document.getElementById('movement-reference').value.trim();
  var notes = document.getElementById('movement-notes').value.trim();

  if (!productId) return showToast('Selectionnez un produit', 'error');
  if (!quantity || quantity < 1) return showToast('Quantite invalide', 'error');
  if (unitPrice === undefined || unitPrice < 0) return showToast('Prix invalide', 'error');

  try {
    await fetchApi('/stock-movements/' + type, {
      method: 'POST',
      body: JSON.stringify({ productId, reason, quantity, unitPrice, reference, notes }),
    });
    showToast((type === 'entry' ? 'Entree' : 'Sortie') + ' enregistree', 'success');
    closeModal('movement-modal');
    loadMovements();
    loadSummary();
    loadProductsForSelect();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadMovements(page) {
  page = page || 1;
  try {
    var type = document.getElementById('filter-type').value;
    var reason = document.getElementById('filter-reason').value;
    var dateFrom = document.getElementById('filter-date-from').value;
    var dateTo = document.getElementById('filter-date-to').value;
    var url = '/stock-movements?page=' + page + '&limit=20';
    if (type) url += '&type=' + type;
    if (reason) url += '&reason=' + reason;
    if (dateFrom) url += '&dateFrom=' + dateFrom;
    if (dateTo) url += '&dateTo=' + dateTo;

    var data = await fetchApi(url);
    renderMovementsTable(data.movements);
    document.getElementById('movements-count').textContent = data.total + ' mouvement(s)';
    renderPagination(data.page, data.pages);
  } catch (err) {
    console.error('Error loading movements:', err);
  }
}

function renderMovementsTable(movements) {
  var tbody = document.getElementById('movements-table-body');
  if (movements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-secondary);">Aucun mouvement</td></tr>';
    return;
  }
  var html = '';
  movements.forEach(function(m, i) {
    var date = new Date(m.movementDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var typeBadge = m.type === 'entry'
      ? '<span class="badge badge-success">Entree</span>'
      : '<span class="badge badge-danger">Sortie</span>';
    var prodName = m.product ? (typeof m.product === 'object' ? m.product.name : '-') : '-';
    var userName = m.performedBy ? (typeof m.performedBy === 'object' ? m.performedBy.name : '-') : '-';

    html += '<tr>' +
      '<td style="color:var(--text-muted);font-size:12px;">' + m.movementNumber + '</td>' +
      '<td>' + date + '</td>' +
      '<td>' + typeBadge + '</td>' +
      '<td>' + (reasonLabels[m.reason] || m.reason) + '</td>' +
      '<td style="font-weight:600;">' + escHtml(prodName) + '</td>' +
      '<td style="font-weight:700;">' + m.quantity + '</td>' +
      '<td>' + m.unitPrice.toFixed(2) + '</td>' +
      '<td style="font-weight:600;">' + m.totalValue.toFixed(2) + ' MAD</td>' +
      '<td style="color:var(--text-secondary);">' + escHtml(m.reference || '-') + '</td>' +
      '<td style="color:var(--text-secondary);">' + escHtml(userName) + '</td>' +
    '</tr>';
  });
  tbody.innerHTML = html;
}

async function loadSummary() {
  try {
    var data = await fetchApi('/stock-movements/summary');
    document.getElementById('stat-entry-qty').textContent = data.summary.entry.totalQty || 0;
    document.getElementById('stat-exit-qty').textContent = data.summary.exit.totalQty || 0;
    document.getElementById('stat-entry-value').textContent = (data.summary.entry.totalValue || 0).toFixed(2) + ' MAD';
    document.getElementById('stat-exit-value').textContent = (data.summary.exit.totalValue || 0).toFixed(2) + ' MAD';
  } catch (err) {
    console.error('Error loading summary:', err);
  }
}

function renderPagination(current, total) {
  renderPaginationWidget('movements-pagination', current, total, 'loadMovements');
}

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function exportMovements(format) {
  var token = localStorage.getItem('token');
  var type = document.getElementById('filter-type').value;
  var dateFrom = document.getElementById('filter-date-from').value;
  var dateTo = document.getElementById('filter-date-to').value;
  var url = '/api/v1/export/movements' + (format === 'pdf' ? '/pdf' : '') + '?token=' + token;
  if (type) url += '&type=' + type;
  if (dateFrom) url += '&dateFrom=' + dateFrom;
  if (dateTo) url += '&dateTo=' + dateTo;
  window.open(url, '_blank');
}
