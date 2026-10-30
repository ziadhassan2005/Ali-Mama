#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../nodejs-ecommerce/.env') });
const mongoose = require('mongoose');
const { Product } = require('../dist/products/models/product.model');

const BACKUP_DIR = path.resolve(__dirname, '../.image-backup');
const FALLBACK_URL = 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80';

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }
  return response.json();
}

function buildSourceMaps() {
  return Promise.all([
    fetchJson('https://dummyjson.com/products?limit=200'),
    fetchJson('https://api.escuelajs.co/api/v1/products?offset=0&limit=1000'),
  ]).then(([dummyJson, escuela]) => {
    const maps = { dummyjson: new Map(), escuela: new Map() };

    for (const entry of (dummyJson.products || [])) {
      const key = normalizeText(entry.title || entry.name || '');
      if (!key) continue;
      maps.dummyjson.set(key, {
        source: 'dummyjson',
        sourceProductId: String(entry.id ?? ''),
        title: entry.title || entry.name || '',
        category: entry.category || '',
        imageUrl: Array.isArray(entry.images) && entry.images[0] ? entry.images[0] : '',
        imageUrls: Array.isArray(entry.images) ? entry.images.filter(Boolean) : [],
      });
    }

    for (const entry of Array.isArray(escuela) ? escuela : []) {
      const key = normalizeText(entry.title || entry.name || '');
      if (!key) continue;
      maps.escuela.set(key, {
        source: 'escuela',
        sourceProductId: String(entry.id ?? ''),
        title: entry.title || entry.name || '',
        category: typeof entry.category === 'object' ? (entry.category.name || '') : (entry.category || ''),
        imageUrl: Array.isArray(entry.images) && entry.images[0] ? entry.images[0] : '',
        imageUrls: Array.isArray(entry.images) ? entry.images.filter(Boolean) : [],
      });
    }

    return maps;
  });
}

function parseImageUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      if (parsed.hostname.includes('imgur')) {
        const pathname = parsed.pathname.toLowerCase();
        const hasExt = /\.(jpe?g|png|webp|gif|avif|bmp|svg)(?:[?#]|$)/i.test(pathname);
        return hasExt ? parsed.toString() : '';
      }
      return parsed.toString();
    }
  } catch {
    // ignore invalid URL strings
  }
  return '';
}

async function repair() {
  await mongoose.connect(process.env.MONGO_URI);

  const sourceMaps = await buildSourceMaps();
  const docs = await Product.find({ importBatchId: { $exists: true, $ne: null } }).lean();

  const preview = [];
  const backup = [];
  const updates = [];

  for (const doc of docs) {
    const key = normalizeText(doc.name || '');
    const sourceMap = doc.importBatchId === 'escuela-import-1000' ? sourceMaps.escuela : sourceMaps.dummyjson;
    const match = sourceMap.get(key);

    const originalImage = parseImageUrl(doc.imageUrl || '');
    const finalImage = match ? parseImageUrl(match.imageUrl || '') : originalImage;

    if (match && finalImage) {
      backup.push({
        _id: String(doc._id),
        name: doc.name,
        category: doc.category,
        importBatchId: doc.importBatchId,
        originalImage: doc.imageUrl || '',
        source: match.source,
        sourceProductId: match.sourceProductId,
      });

      preview.push({
        name: doc.name,
        category: doc.category,
        source: match.source,
        originalImage: doc.imageUrl || '',
        finalImage,
      });

      updates.push({
        filter: { _id: doc._id },
        update: {
          $set: {
            imageUrl: finalImage,
            imageUrls: match.imageUrls || [finalImage],
            source: match.source,
            sourceProductId: match.sourceProductId,
            sourceImageUrl: finalImage,
            needsImageCorrection: false,
          },
        },
      });
    } else if (doc.imageUrl && doc.imageUrl !== FALLBACK_URL) {
      backup.push({
        _id: String(doc._id),
        name: doc.name,
        category: doc.category,
        importBatchId: doc.importBatchId,
        originalImage: doc.imageUrl,
        source: 'unknown',
        sourceProductId: null,
      });
      updates.push({
        filter: { _id: doc._id },
        update: {
          $set: {
            needsImageCorrection: true,
          },
        },
      });
    } else {
      backup.push({
        _id: String(doc._id),
        name: doc.name,
        category: doc.category,
        importBatchId: doc.importBatchId,
        originalImage: doc.imageUrl || '',
        source: 'unknown',
        sourceProductId: null,
      });
      updates.push({
        filter: { _id: doc._id },
        update: {
          $set: {
            needsImageCorrection: true,
          },
        },
      });
    }
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupFile = path.join(BACKUP_DIR, `product-image-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  console.log('Backup written to:', backupFile);
  console.log('Preview (first 20 matched products):');
  console.log(JSON.stringify(preview.slice(0, 20), null, 2));

  let updated = 0;
  for (const item of updates) {
    const result = await Product.updateOne(item.filter, item.update);
    if (result.modifiedCount || result.matchedCount) updated += 1;
  }

  console.log('Updated product records:', updated);
  await mongoose.disconnect();
}

repair().catch((error) => {
  console.error('Repair failed:', error);
  process.exit(1);
});
