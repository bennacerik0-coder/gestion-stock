var allSuppliers = [];
var allProducts = [];
var orderItems = [];
var currentReceiveOrderId = null;

var statusLabels = { draft: 'Brouillon', pending: 'En attente', approved: 'Approuvee', ordered: 'Commandee', partial: 'Partielle', received: 'Recue', cancelled: 'Annulee' };
var statusBadges = { draft: 'badge-secondary', pending: 'badge-info', approved: 'badge-success', ordered: 'badge-warning', partial: 'badge-warning', received: 'badge-success', cancelled: 'badge-danger' };

document.addEventListener('DOMContentLoaded', function() {
  if (!checkAuth()) return;
  loadFormData();
  loadOrders();
});

async function loadFormData() {
  try {
    var supData = await fetchApi('/suppliers?limit=500');
    allSuppliers = supData.suppliers;
    var prodData = await fetchApi('/products?limit=500');
    allProducts = prodData.products;
    populateSupplierSelect();
  } catch (err) {
    console.error('Error loading form data:', err);
  }
}

function populateSupplierSelect() {
  var select = document.getElementById('order-supplier');
  select.innerHTML = '<option value="">Selectionner...</option>';
  allSuppliers.forEach(function(s) {
    select.innerHTML += '<option value="' + s._id + '">' + s.name + '</option>';
  });
}

function openOrderModal(order) {
  document.getElementById('order-id').value = '';
  document.getElementById('order-supplier').value = '';
  document.getElementById('order-expected-date').value = '';
  document.getElementById('order-notes').value = '';
  document.getElementById('order-modal-title').textContent = 'Nouvelle commande';
  orderItems = [];

  if (order) {
    document.getElementById('order-id').value = order._id;
    document.getElementById('order-supplier').value = typeof order.supplier === 'object' ? order.supplier._id : order.supplier;
    if (order.expectedDate) document.getElementById('order-expected-date').value = order.expectedDate.slice(0, 10);
    document.getElementById('order-notes').value = order.notes || '';
    document.getElementById('order-modal-title').textContent = 'Modifier la commande ' + order.orderNumber;
    order.items.forEach(function(item) {
      orderItems.push({ productId: typeof item.product === 'object' ? item.product._id : item.product, quantity: item.quantity, unitPrice: item.unitPrice });
    });
  }

  renderOrderItems();
  openModal('order-modal');
}

function addOrderItem() {
  orderItems.push({ productId: '', quantity: 1, unitPrice: 0 });
  renderOrderItems();
}

function removeOrderItem(index) {
  orderItems.splice(index, 1);
  renderOrderItems();
  updateOrderTotal();
}

function renderOrderItems() {
  var container = document.getElementById('order-items-container');
  if (orderItems.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;background:var(--bg-input);border-radius:var(--radius-xs);">Aucun article. Cliquez sur "+ Ajouter un article"</p>';
    return;
  }
  var html = '<table style="width:100%;"><thead><tr><th style="padding:8px;">Produit</th><th style="padding:8px;width:100px;">Qte</th><th style="padding:8px;width:120px;">Prix unit.</th><th style="padding:8px;width:120px;">Total</th><th style="padding:8px;width:50px;"></th></tr></thead><tbody>';
  orderItems.forEach(function(item, i) {
    var prodOpts = '<option value="">Selectionner...</option>';
    allProducts.forEach(function(p) {
      var sel = item.productId === p._id ? ' selected' : '';
      prodOpts += '<option value="' + p._id + '"' + sel + '>' + p.name + ' (' + p.sku + ')</option>';
    });
    var lineTotal = (item.quantity * item.unitPrice).toFixed(2);
    html += '<tr>' +
      '<td style="padding:4px;"><select onchange="orderItems[' + i + '].productId=this.value" style="width:100%;padding:6px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-primary);font-size:13px;">' + prodOpts + '</select></td>' +
      '<td style="padding:4px;"><input type="number" value="' + item.quantity + '" min="1" onchange="orderItems[' + i + '].quantity=parseInt(this.value);updateOrderTotal()" style="width:100%;padding:6px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-primary);font-size:13px;"></td>' +
      '<td style="padding:4px;"><input type="number" value="' + item.unitPrice + '" step="0.01" min="0" onchange="orderItems[' + i + '].unitPrice=parseFloat(this.value);updateOrderTotal()" style="width:100%;padding:6px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-primary);font-size:13px;"></td>' +
      '<td style="padding:8px;font-weight:600;">' + lineTotal + ' MAD</td>' +
      '<td style="padding:4px;text-align:center;"><button class="btn btn-danger btn-sm" onclick="removeOrderItem(' + i + ')" style="padding:2px 6px;font-size:11px;">&#10006;</button></td>' +
    '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
  updateOrderTotal();
}

function updateOrderTotal() {
  var total = 0;
  orderItems.forEach(function(item) { total += item.quantity * item.unitPrice; });
  document.getElementById('order-total').textContent = total.toFixed(2);
}

async function saveOrder(status) {
  var supplier = document.getElementById('order-supplier').value;
  var expectedDate = document.getElementById('order-expected-date').value;
  var notes = document.getElementById('order-notes').value.trim();
  var id = document.getElementById('order-id').value;

  if (!supplier) return showToast('Selectionnez un fournisseur', 'error');
  if (orderItems.length === 0) return showToast('Ajoutez au moins un article', 'error');

  for (var i = 0; i < orderItems.length; i++) {
    if (!orderItems[i].productId) return showToast('Article ' + (i + 1) + ': produit requis', 'error');
  }

  var body = { supplier, items: orderItems, expectedDate: expectedDate || null, notes, status };

  try {
    if (id) {
      await fetchApi('/purchase-orders/' + id, { method: 'PUT', body: JSON.stringify(body) });
      if (status !== 'draft') {
        await fetchApi('/purchase-orders/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status: 'pending' }) });
      }
      showToast('Commande modifiee', 'success');
    } else {
      await fetchApi('/purchase-orders', { method: 'POST', body: JSON.stringify(body) });
      showToast('Commande creee', 'success');
    }
    closeModal('order-modal');
    loadOrders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadOrders(page) {
  page = page || 1;
  try {
    var status = document.getElementById('filter-status').value;
    var url = '/purchase-orders?page=' + page + '&limit=20';
    if (status) url += '&status=' + status;
    var data = await fetchApi(url);
    renderOrdersTable(data.orders);
  } catch (err) {
    console.error('Error loading orders:', err);
  }
}

function renderOrdersTable(orders) {
  var tbody = document.getElementById('orders-table-body');
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary);">Aucune commande</td></tr>';
    return;
  }
  var html = '';
  orders.forEach(function(o) {
    var date = new Date(o.createdAt).toLocaleDateString('fr-FR');
    var expected = o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('fr-FR') : '-';
    var supName = o.supplier ? (typeof o.supplier === 'object' ? o.supplier.name : '-') : '-';
    var badge = statusBadges[o.status] || 'badge-secondary';

    var actions = '';
    if (['draft', 'pending'].includes(o.status)) {
      actions += '<button class="btn btn-secondary btn-sm" onclick="editOrder(\'' + o._id + '\')" style="padding:4px 8px;font-size:11px;">&#9998;</button> ';
    }
    if (['draft', 'pending'].includes(o.status)) {
      actions += '<button class="btn btn-success btn-sm" onclick="changeStatus(\'' + o._id + '\',\'approved\')" style="padding:4px 8px;font-size:11px;">Approuver</button> ';
    }
    if (o.status === 'approved') {
      actions += '<button class="btn btn-warning btn-sm" onclick="changeStatus(\'' + o._id + '\',\'ordered\')" style="padding:4px 8px;font-size:11px;">Commander</button> ';
    }
    if (['ordered', 'partial'].includes(o.status)) {
      actions += '<button class="btn btn-primary btn-sm" onclick="openReceiveModal(\'' + o._id + '\')" style="padding:4px 8px;font-size:11px;">Receptionner</button> ';
    }
    if (['draft', 'pending'].includes(o.status)) {
      actions += '<button class="btn btn-danger btn-sm" onclick="changeStatus(\'' + o._id + '\',\'cancelled\')" style="padding:4px 8px;font-size:11px;">Annuler</button>';
    }

    html += '<tr>' +
      '<td style="font-weight:600;"><code style="background:var(--bg-input);padding:2px 6px;border-radius:4px;font-size:12px;">' + o.orderNumber + '</code></td>' +
      '<td>' + escHtml(supName) + '</td>' +
      '<td>' + o.items.length + ' article(s)</td>' +
      '<td style="font-weight:700;">' + o.totalAmount.toFixed(2) + ' MAD</td>' +
      '<td><span class="badge ' + badge + '">' + (statusLabels[o.status] || o.status) + '</span></td>' +
      '<td>' + date + '</td>' +
      '<td>' + expected + '</td>' +
      '<td>' + actions + '</td>' +
    '</tr>';
  });
  tbody.innerHTML = html;
}

async function editOrder(id) {
  try {
    var data = await fetchApi('/purchase-orders/' + id);
    openOrderModal(data.order);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function changeStatus(id, status) {
  var labels = { approved: 'approuver', ordered: 'commander', cancelled: 'annuler' };
  if (!confirm('Voulez-vous ' + labels[status] + ' cette commande ?')) return;
  try {
    await fetchApi('/purchase-orders/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) });
    showToast('Commande ' + (labels[status] || 'mise a jour'), 'success');
    loadOrders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

var receiveItems = [];
async function openReceiveModal(id) {
  try {
    currentReceiveOrderId = id;
    var data = await fetchApi('/purchase-orders/' + id);
    var order = data.order;
    document.getElementById('receive-modal-title').textContent = 'Reception - ' + order.orderNumber;
    receiveItems = [];
    order.items.forEach(function(item) {
      var remaining = item.quantity - item.receivedQuantity;
      if (remaining > 0) {
        receiveItems.push({ product: typeof item.product === 'object' ? item.product : item.product, productName: typeof item.product === 'object' ? item.product.name : 'Produit', remaining: remaining, receivedQuantity: 0, unitPrice: item.unitPrice });
      }
    });
    renderReceiveItems();
    openModal('receive-modal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderReceiveItems() {
  var container = document.getElementById('receive-items-container');
  if (receiveItems.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">Tous les articles ont ete recus</p>';
    return;
  }
  var html = '';
  receiveItems.forEach(function(item, i) {
    html += '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-input);border-radius:var(--radius-xs);margin-bottom:8px;">'
      + '<div style="flex:1;"><strong>' + escHtml(item.productName) + '</strong><br><span style="font-size:12px;color:var(--text-secondary);">Restant: ' + item.remaining + '</span></div>'
      + '<input type="number" min="0" max="' + item.remaining + '" value="0" onchange="receiveItems[' + i + '].receivedQuantity=parseInt(this.value)" style="width:80px;padding:6px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-primary);font-size:13px;">'
    + '</div>';
  });
  container.innerHTML = html;
}

async function confirmReceive() {
  if (!currentReceiveOrderId) return;
  var toReceive = receiveItems.filter(function(r) { return r.receivedQuantity > 0; });
  if (toReceive.length === 0) return showToast('Entrez au moins une quantite', 'error');

  try {
    await fetchApi('/purchase-orders/' + currentReceiveOrderId + '/receive', {
      method: 'POST',
      body: JSON.stringify({ items: toReceive.map(function(r) { return { product: r.product, receivedQuantity: r.receivedQuantity }; }) }),
    });
    showToast('Reception enregistree', 'success');
    closeModal('receive-modal');
    loadOrders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
