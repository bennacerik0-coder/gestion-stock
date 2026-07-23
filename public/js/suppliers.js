var searchTimeout = null;

document.addEventListener('DOMContentLoaded', function() {
  if (!checkAuth()) return;
  loadSuppliers();
});

async function loadSuppliers(page) {
  page = page || 1;
  try {
    var search = document.getElementById('search-suppliers').value;
    var url = '/suppliers?page=' + page + '&limit=50';
    if (search) url += '&search=' + encodeURIComponent(search);
    var data = await fetchApi(url);
    renderSuppliersTable(data.suppliers);
  } catch (err) {
    console.error('Error loading suppliers:', err);
  }
}

function renderSuppliersTable(suppliers) {
  var tbody = document.getElementById('suppliers-table-body');
  if (suppliers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">Aucun fournisseur</td></tr>';
    return;
  }
  var html = '';
  suppliers.forEach(function(s) {
    html += '<tr>' +
      '<td style="font-weight:600;">' + escHtml(s.name) + '</td>' +
      '<td>' + escHtml(s.contactName || '-') + '</td>' +
      '<td>' + escHtml(s.email || '-') + '</td>' +
      '<td>' + escHtml(s.phone || '-') + '</td>' +
      '<td><span class="badge badge-info">' + (s.productCount || 0) + '</span></td>' +
      '<td>' +
        '<button class="btn btn-secondary btn-sm" onclick="editSupplier(\'' + s._id + '\')" style="padding:4px 8px;">&#9998;</button> ' +
        '<button class="btn btn-danger btn-sm" onclick="deleteSupplier(\'' + s._id + '\')" style="padding:4px 8px;">&#128465;</button>' +
      '</td>' +
    '</tr>';
  });
  tbody.innerHTML = html;
}

function searchSuppliers() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function() { loadSuppliers(); }, 300);
}

function openSupplierModal(supplier) {
  document.getElementById('supplier-id').value = '';
  document.getElementById('supplier-name').value = '';
  document.getElementById('supplier-contact').value = '';
  document.getElementById('supplier-email').value = '';
  document.getElementById('supplier-phone').value = '';
  document.getElementById('supplier-address').value = '';
  document.getElementById('supplier-website').value = '';
  document.getElementById('supplier-notes').value = '';
  document.getElementById('supplier-modal-title').textContent = 'Ajouter un fournisseur';

  if (supplier) {
    document.getElementById('supplier-id').value = supplier._id;
    document.getElementById('supplier-name').value = supplier.name;
    document.getElementById('supplier-contact').value = supplier.contactName || '';
    document.getElementById('supplier-email').value = supplier.email || '';
    document.getElementById('supplier-phone').value = supplier.phone || '';
    document.getElementById('supplier-address').value = supplier.address || '';
    document.getElementById('supplier-website').value = supplier.website || '';
    document.getElementById('supplier-notes').value = supplier.notes || '';
    document.getElementById('supplier-modal-title').textContent = 'Modifier le fournisseur';
  }
  openModal('supplier-modal');
}

async function editSupplier(id) {
  try {
    var data = await fetchApi('/suppliers/' + id);
    openSupplierModal(data.supplier);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveSupplier() {
  var id = document.getElementById('supplier-id').value;
  var body = {
    name: document.getElementById('supplier-name').value.trim(),
    contactName: document.getElementById('supplier-contact').value.trim(),
    email: document.getElementById('supplier-email').value.trim(),
    phone: document.getElementById('supplier-phone').value.trim(),
    address: document.getElementById('supplier-address').value.trim(),
    website: document.getElementById('supplier-website').value.trim(),
    notes: document.getElementById('supplier-notes').value.trim(),
  };
  if (!body.name) return showToast('Le nom est requis', 'error');

  try {
    if (id) {
      await fetchApi('/suppliers/' + id, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Fournisseur modifie', 'success');
    } else {
      await fetchApi('/suppliers', { method: 'POST', body: JSON.stringify(body) });
      showToast('Fournisseur ajoute', 'success');
    }
    closeModal('supplier-modal');
    loadSuppliers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteSupplier(id) {
  if (!confirm('Supprimer ce fournisseur ?')) return;
  try {
    await fetchApi('/suppliers/' + id, { method: 'DELETE' });
    showToast('Fournisseur supprime', 'success');
    loadSuppliers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
