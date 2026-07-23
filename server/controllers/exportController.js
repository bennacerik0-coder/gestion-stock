const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Category = require('../models/Category');
const Settings = require('../models/Settings');

exports.productsExcel = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort('name');

    const rows = products.map(function(p) {
      return {
        'Nom': p.name,
        'SKU': p.sku,
        'Categorie': p.category ? p.category.name : '',
        'Fournisseur': p.supplier ? p.supplier.name : '',
        'Unite': p.unit,
        'Stock': p.stock,
        'Stock Min': p.minStock,
        'Stock Max': p.maxStock,
        'Prix Achat': p.buyingPrice,
        'Prix Vente': p.sellingPrice,
        'Emplacement': p.location,
        'Statut': p.stock === 0 ? 'Rupture' : p.stock <= p.minStock ? 'Stock bas' : p.stock >= p.maxStock ? 'Sureffectif' : 'Normal',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produits');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=produits.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.movementsExcel = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { dateFrom, dateTo, type } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (dateFrom || dateTo) {
      filter.movementDate = {};
      if (dateFrom) filter.movementDate.$gte = new Date(dateFrom);
      if (dateTo) filter.movementDate.$lte = new Date(dateTo + 'T23:59:59');
    }

    const movements = await StockMovement.find(filter)
      .populate('product', 'name sku unit')
      .populate('performedBy', 'name')
      .sort({ movementDate: -1 });

    var reasonLabels = { purchase: 'Achat', return: 'Retour', adjustment_up: 'Ajustement +', sale: 'Vente', consumption: 'Consommation', damage: 'Degat', adjustment_down: 'Ajustement -' };

    const rows = movements.map(function(m) {
      return {
        'Numero': m.movementNumber,
        'Date': new Date(m.movementDate).toLocaleDateString('fr-FR'),
        'Type': m.type === 'entry' ? 'Entree' : 'Sortie',
        'Raison': reasonLabels[m.reason] || m.reason,
        'Produit': m.product ? m.product.name : '',
        'SKU': m.product ? m.product.sku : '',
        'Quantite': m.quantity,
        'Prix Unitaire': m.unitPrice,
        'Total': m.totalValue,
        'Reference': m.reference,
        'Par': m.performedBy ? m.performedBy.name : '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mouvements');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=mouvements.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.productsPdf = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const settings = await Settings.getSettings();
    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .sort('name');

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=catalogue-produits.pdf');
    doc.pipe(res);

    if (settings.company.logo) {
      try { doc.image(settings.company.logo, 40, 30, { width: 50 }); } catch(e) {}
    }
    var headerY = 35;
    doc.fontSize(18).font('Helvetica-Bold').text(settings.company.name || 'Catalogue des Produits', settings.company.logo ? 100 : 40, headerY, { align: settings.company.logo ? 'left' : 'center', width: settings.company.logo ? 660 : 720 });
    if (settings.company.address || settings.company.phone) {
      doc.fontSize(9).font('Helvetica').fillColor('#666').text(
        (settings.company.address || '') + (settings.company.address && settings.company.phone ? ' | ' : '') + (settings.company.phone || ''),
        settings.company.logo ? 100 : 40, headerY + 22, { width: settings.company.logo ? 660 : 720, align: settings.company.logo ? 'left' : 'center' }
      );
    }
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Genere le ' + new Date().toLocaleDateString('fr-FR'), { align: 'center' });
    doc.moveDown(1);

    const headers = ['Nom', 'SKU', 'Categorie', 'Stock', 'Min/Max', 'Prix Achat', 'Prix Vente', 'Emplacement'];
    const widths = [140, 70, 80, 50, 60, 70, 70, 80];
    let y = doc.y;
    let x = 40;

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#333');
    headers.forEach(function(h, i) {
      doc.text(h, x, y, { width: widths[i], align: 'left' });
      x += widths[i];
    });
    y += 18;
    doc.moveTo(40, y).lineTo(760, y).stroke('#ccc');
    y += 5;

    doc.font('Helvetica').fontSize(8).fillColor('#333');
    products.forEach(function(p) {
      if (y > 560) {
        doc.addPage();
        y = 40;
      }
      x = 40;
      var catName = p.category ? p.category.name : '';
      var row = [p.name, p.sku, catName, p.stock, p.minStock + '/' + p.maxStock, p.buyingPrice.toFixed(2), p.sellingPrice.toFixed(2), p.location];
      row.forEach(function(val, i) {
        doc.text(String(val), x, y, { width: widths[i], align: 'left' });
        x += widths[i];
      });
      y += 16;
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.movementsPdf = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const settings = await Settings.getSettings();
    const { dateFrom, dateTo, type } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (dateFrom || dateTo) {
      filter.movementDate = {};
      if (dateFrom) filter.movementDate.$gte = new Date(dateFrom);
      if (dateTo) filter.movementDate.$lte = new Date(dateTo + 'T23:59:59');
    }

    const movements = await StockMovement.find(filter)
      .populate('product', 'name sku')
      .populate('performedBy', 'name')
      .sort({ movementDate: -1 });

    var reasonLabels = { purchase: 'Achat', return: 'Retour', adjustment_up: 'Ajustement +', sale: 'Vente', consumption: 'Consommation', damage: 'Degat', adjustment_down: 'Ajustement -' };

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=mouvements.pdf');
    doc.pipe(res);

    if (settings.company.logo) {
      try { doc.image(settings.company.logo, 40, 30, { width: 50 }); } catch(e) {}
    }
    var headerY = 35;
    doc.fontSize(18).font('Helvetica-Bold').text(settings.company.name || 'Journal des Mouvements', settings.company.logo ? 100 : 40, headerY, { align: settings.company.logo ? 'left' : 'center', width: settings.company.logo ? 660 : 720 });
    if (settings.company.address || settings.company.phone) {
      doc.fontSize(9).font('Helvetica').fillColor('#666').text(
        (settings.company.address || '') + (settings.company.address && settings.company.phone ? ' | ' : '') + (settings.company.phone || ''),
        settings.company.logo ? 100 : 40, headerY + 22, { width: settings.company.logo ? 660 : 720, align: settings.company.logo ? 'left' : 'center' }
      );
    }
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Genere le ' + new Date().toLocaleDateString('fr-FR'), { align: 'center' });
    doc.moveDown(1);

    const headers = ['Numero', 'Date', 'Type', 'Raison', 'Produit', 'Qte', 'Prix', 'Total', 'Reference', 'Par'];
    const widths = [90, 65, 45, 70, 120, 35, 50, 60, 80, 80];
    let y = doc.y;

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#333');
    let x = 40;
    headers.forEach(function(h, i) {
      doc.text(h, x, y, { width: widths[i], align: 'left' });
      x += widths[i];
    });
    y += 18;
    doc.moveTo(40, y).lineTo(760, y).stroke('#ccc');
    y += 5;

    doc.font('Helvetica').fontSize(8).fillColor('#333');
    movements.forEach(function(m) {
      if (y > 560) { doc.addPage(); y = 40; }
      x = 40;
      var prodName = m.product ? m.product.name : '-';
      var userName = m.performedBy ? m.performedBy.name : '-';
      var row = [
        m.movementNumber,
        new Date(m.movementDate).toLocaleDateString('fr-FR'),
        m.type === 'entry' ? 'Entree' : 'Sortie',
        reasonLabels[m.reason] || m.reason,
        prodName,
        String(m.quantity),
        m.unitPrice.toFixed(2),
        m.totalValue.toFixed(2),
        m.reference || '-',
        userName
      ];
      row.forEach(function(val, i) {
        doc.text(val, x, y, { width: widths[i], align: 'left' });
        x += widths[i];
      });
      y += 16;
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
