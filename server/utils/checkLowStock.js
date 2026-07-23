const Alert = require('../models/Alert');
const Product = require('../models/Product');

async function checkLowStock(productId) {
  try {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) return;

    await Alert.deleteMany({ product: productId, isRead: false });

    if (product.stock === 0) {
      await Alert.create({
        type: 'low_stock',
        severity: 'critical',
        product: productId,
        message: product.name + ' en RUPTURE DE STOCK',
      });
    } else if (product.stock <= product.minStock) {
      await Alert.create({
        type: 'low_stock',
        severity: 'warning',
        product: productId,
        message: product.name + ' stock bas (' + product.stock + '/' + product.minStock + ')',
      });
    } else if (product.stock >= product.maxStock) {
      await Alert.create({
        type: 'overstock',
        severity: 'info',
        product: productId,
        message: product.name + ' sureffectif (' + product.stock + '/' + product.maxStock + ')',
      });
    }
  } catch (err) {
    console.error('checkLowStock error:', err.message);
  }
}

module.exports = checkLowStock;
