#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Product } = require('../dist/products/models/product.model');

const BACKUP_DIR = path.resolve(__dirname, '../.product-cleanup-backup');

function isRandomizedName(name) {
  return typeof name === 'string' && (
    /^[A-Za-z0-9]{12,}$/.test(name.trim()) ||
    /^title-[a-f0-9-]{8,}$/i.test(name.trim()) ||
    /^test\d*$/i.test(name.trim()) ||
    /^asdasd$/i.test(name.trim())
  );
}

function isPlaceholderDescription(description) {
  return typeof description === 'string' && (
    /^new description$/i.test(description.trim()) ||
    /lorem ipsum/i.test(description.trim()) ||
    /^product\s*\d+$/i.test(description.trim()) ||
    /^test product$/i.test(description.trim()) ||
    /^desc-[a-f0-9-]{8,}$/i.test(description.trim()) ||
    /^asdasd+$/i.test(description.trim()) ||
    /^asdasdasd$/i.test(description.trim())
  );
}

function isClearlySyntheticProduct(doc) {
  const name = String(doc.name ?? '').trim();
  const description = String(doc.description ?? '').trim();
  const imageUrl = String(doc.imageUrl ?? '').trim();
  const batch = doc.importBatchId || '';
  const randomName = isRandomizedName(name);
  const placeholderText = isPlaceholderDescription(description) || /^new description$/i.test(description);
  const placeholderImage = /placehold\.co/i.test(imageUrl);

  if (randomName && placeholderText) return true;
  if (batch === 'escuela-import-1000' && randomName && description === 'new description') return true;
  if (placeholderImage && (randomName || placeholderText || /^title-/i.test(name) || /^desc-/i.test(description))) return true;
  if (placeholderImage && /^test\d*$/i.test(name)) return true;
  return false;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const allProducts = await Product.find({}).lean();
  const totalBefore = allProducts.length;
  const fakeProducts = allProducts.filter(isClearlySyntheticProduct);

  const report = fakeProducts.map((doc) => ({
    _id: String(doc._id),
    name: doc.name,
    description: doc.description,
    category: doc.category,
    importBatchId: doc.importBatchId || null,
    source: doc.source || null,
    sourceProductId: doc.sourceProductId || null,
    createdAt: doc.createdAt || null,
    deletionReason: `Synthetic import record: randomized product name (${isRandomizedName(doc.name)}) and placeholder description (${isPlaceholderDescription(doc.description) ? doc.description : 'new description'}).`
  }));

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(BACKUP_DIR, `fake-products-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(report, null, 2));

  console.log('Total products before cleanup:', totalBefore);
  console.log('Fake products identified:', fakeProducts.length);
  console.log('Products to delete:', fakeProducts.length);
  console.log('Backup written to:', backupPath);
  console.log('Sample fake reports:');
  console.log(JSON.stringify(report.slice(0, 10), null, 2));

  if (fakeProducts.length === 0) {
    await mongoose.disconnect();
    return;
  }

  const idsToDelete = fakeProducts.map((doc) => doc._id);
  const result = await Product.deleteMany({ _id: { $in: idsToDelete } });
  const remaining = await Product.countDocuments();
  const remainingSynthetic = await Product.countDocuments({
    $or: [
      { name: { $regex: /^[A-Za-z0-9]{12,}$/ } },
      { description: /^new description$/i }
    ]
  });

  console.log('Delete result:', JSON.stringify({ deletedCount: result.deletedCount, remaining, remainingSynthetic }, null, 2));
  console.log('Deleted product IDs:', idsToDelete.join(', '));

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
