let allCategories = [];
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', function() {
  if (!checkAuth()) return;
  loadCategories();
  loadProducts();
});

// ===== CATEGORIES =====
async function loadCategories() {
  try {
    const data = await fetchApi('/categories');
    allCategories = data.categories;
    populateCategorySelects();
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

function populateCategorySelects() {
  const filterSelect = document.getElementById('filter-category');
  const productSelect = document.getElementById('product-category');
  const filterVal = filterSelect.value;
  const productVal = productSelect.value;

  filterSelect.innerHTML = '<option value="">Toutes les categories</option>';
  productSelect.innerHTML = '<option value="">Selectionner...</option>';

  allCategories.forEach(function(cat) {
    filterSelect.innerHTML += '<option value="' + cat._id + '">' + cat.name + '</option>';
    productSelect.innerHTML += '<option value="' + cat._id + '">' + cat.name + '</option>';
  });

  filterSelect.value = filterVal;
  productSelect.value = productVal;
}

function openCategoryModal() {
  renderCategoriesList();
  openModal('category-modal');
}

function renderCategoriesList() {
  const container = document.getElementById('categories-list');
  if (allCategories.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px;">Aucune categorie</p>';
    return;
  }
  var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
  allCategories.forEach(function(cat) {
    html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg-input);border-radius:var(--radius-xs);">' +
      '<div style="width:16px;height:16px;border-radius:50%;background:' + cat.color + ';flex-shrink:0;"></div>' +
      '<div style="flex:1;font-weight:600;">' + cat.name + '</div>' +
      '<button class="btn btn-danger btn-sm" onclick="deleteCategory(\'' + cat._id + '\')" style="padding:4px 8px;font-size:11px;">Supprimer</button>' +
    '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

async function addCategory() {
  const name = document.getElementById('new-category-name').value.trim();
  const color = document.getElementById('new-category-color').value;
  if (!name) return showToast('Entrez un nom de categorie', 'error');
  try {
    await fetchApi('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    document.getElementById('new-category-name').value = '';
    showToast('Categorie ajoutee', 'success');
    await loadCategories();
    renderCategoriesList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Supprimer cette categorie ?')) return;
  try {
    await fetchApi('/categories/' + id, { method: 'DELETE' });
    showToast('Categorie supprimee', 'success');
    await loadCategories();
    renderCategoriesList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===== PRODUCTS =====
async function loadProducts(page) {
  page = page || 1;
  try {
    var category = document.getElementById('filter-category').value;
    var status = document.getElementById('filter-status').value;
    var search = document.getElementById('search-products').value;
    var url = '/products?page=' + page + '&limit=20';
    if (category) url += '&category=' + category;
    if (status) url += '&status=' + status;
    if (search) url += '&search=' + encodeURIComponent(search);

    var data = await fetchApi(url);
    renderProductsTable(data.products);
    document.getElementById('products-count').textContent = data.total + ' produit(s) trouve(s)';
    renderPagination(data.page, data.pages);
  } catch (err) {
    console.error('Error loading products:', err);
    showToast('Erreur chargement produits', 'error');
  }
}

function renderProductsTable(products) {
  var tbody = document.getElementById('products-table-body');
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-secondary);">Aucun produit trouve</td></tr>';
    return;
  }
  var html = '';
  products.forEach(function(p) {
    var statusBadge = getStatusBadge(p);
    var catName = p.category ? (typeof p.category === 'object' ? p.category.name : '-') : '-';
    var catColor = p.category && typeof p.category === 'object' ? p.category.color : '#3b82f6';
    html += '<tr>' +
      '<td style="font-weight:600;">' + escHtml(p.name) + '</td>' +
      '<td><code style="background:var(--bg-input);padding:2px 6px;border-radius:4px;font-size:12px;">' + escHtml(p.sku) + '</code></td>' +
      '<td><span class="badge" style="background:' + catColor + '22;color:' + catColor + ';">' + escHtml(catName) + '</span></td>' +
      '<td style="font-weight:700;">' + p.stock + ' ' + escHtml(p.unit) + '</td>' +
      '<td style="color:var(--text-secondary);">' + p.minStock + ' / ' + p.maxStock + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' + p.buyingPrice.toFixed(2) + ' MAD</td>' +
      '<td>' + p.sellingPrice.toFixed(2) + ' MAD</td>' +
      '<td>' +
        '<button class="btn btn-secondary btn-sm" onclick="showBarcode(\'' + p._id + '\')" title="QR Code" style="padding:4px 8px;">&#9641;</button> ' +
        '<button class="btn btn-secondary btn-sm" onclick="editProduct(\'' + p._id + '\')" title="Modifier" style="padding:4px 8px;">&#9998;</button> ' +
        '<button class="btn btn-danger btn-sm" onclick="deleteProduct(\'' + p._id + '\')" title="Supprimer" style="padding:4px 8px;">&#128465;</button>' +
      '</td>' +
    '</tr>';
  });
  tbody.innerHTML = html;
}

function getStatusBadge(p) {
  if (p.stock === 0) return '<span class="badge badge-danger">Rupture</span>';
  if (p.stock <= p.minStock) return '<span class="badge badge-warning">Stock bas</span>';
  if (p.stock >= p.maxStock) return '<span class="badge badge-info">Sureffectif</span>';
  return '<span class="badge badge-success">Normal</span>';
}

function renderPagination(current, total) {
  renderPaginationWidget('products-pagination', current, total, 'loadProducts');
}

function searchProducts() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function() { loadProducts(1); }, 300);
}

// ===== PRODUCT CRUD =====
function openProductModal(product) {
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-sku').value = '';
  document.getElementById('product-category').value = '';
  document.getElementById('product-unit').value = 'piece';
  document.getElementById('product-buying-price').value = '';
  document.getElementById('product-stock').value = '0';
  document.getElementById('product-min-stock').value = '10';
  document.getElementById('product-max-stock').value = '100';
  document.getElementById('product-location').value = '';
  document.getElementById('product-description').value = '';
  document.getElementById('product-modal-title').textContent = 'Ajouter un produit';

  if (product) {
    document.getElementById('product-id').value = product._id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-sku').value = product.sku;
    document.getElementById('product-category').value = typeof product.category === 'object' ? product.category._id : product.category;
    document.getElementById('product-unit').value = product.unit;
    document.getElementById('product-buying-price').value = product.buyingPrice;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-min-stock').value = product.minStock;
    document.getElementById('product-max-stock').value = product.maxStock;
    document.getElementById('product-location').value = product.location;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-modal-title').textContent = 'Modifier le produit';
  }

  openModal('product-modal');
}

async function editProduct(id) {
  try {
    var data = await fetchApi('/products/' + id);
    openProductModal(data.product);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveProduct() {
  var id = document.getElementById('product-id').value;
  var body = {
    name: document.getElementById('product-name').value.trim(),
    sku: document.getElementById('product-sku').value.trim(),
    category: document.getElementById('product-category').value,
    unit: document.getElementById('product-unit').value,
    buyingPrice: parseFloat(document.getElementById('product-buying-price').value) || 0,
    sellingPrice: 0,
    stock: parseInt(document.getElementById('product-stock').value) || 0,
    minStock: parseInt(document.getElementById('product-min-stock').value) || 10,
    maxStock: parseInt(document.getElementById('product-max-stock').value) || 100,
    location: document.getElementById('product-location').value.trim(),
    description: document.getElementById('product-description').value.trim(),
  };

  if (!body.name || !body.sku || !body.category) {
    return showToast('Nom, SKU et categorie sont requis', 'error');
  }

  try {
    if (id) {
      await fetchApi('/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Produit modifie', 'success');
    } else {
      await fetchApi('/products', { method: 'POST', body: JSON.stringify(body) });
      showToast('Produit ajoute', 'success');
    }
    closeModal('product-modal');
    loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Supprimer ce produit ?')) return;
  try {
    await fetchApi('/products/' + id, { method: 'DELETE' });
    showToast('Produit supprime', 'success');
    loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function showBarcode(id) {
  try {
    var data = await fetchApi('/products/' + id + '/barcode');
    document.getElementById('barcode-image').innerHTML = '<img src="' + data.barcode + '" alt="QR Code" style="max-width:200px;">';
    document.getElementById('barcode-info').innerHTML = 'Scan ce code pour identifier le produit';
    openModal('barcode-modal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
