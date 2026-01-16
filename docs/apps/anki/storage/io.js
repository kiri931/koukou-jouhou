import { assertDatasetSchemaV1 } from '../util/schema.js';

export async function importDatasetJson(db, jsonText) {
  const raw = JSON.parse(jsonText);
  assertDatasetSchemaV1(raw);

  const datasetId = raw.datasetId;
  const importedAt = new Date().toISOString();

  await db.upsertDatasetMeta({
    datasetId,
    title: raw.title,
    description: raw.description || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    importedAt,
    schema: raw.schema,
  });

  const cards = (raw.cards || []).map(c => ({
    datasetId,
    cardId: c.id,
    topic: c.topic || '',
    question: c.question || '',
    answers: Array.isArray(c.answers) ? c.answers.map(String) : [],
    explanation: c.explanation || '',
    tags: Array.isArray(c.tags) ? c.tags : [],
    createdAt: c.createdAt || null,
    updatedAt: c.updatedAt || null,
  }));

  await db.bulkPutCards(cards);

  return { datasetId, title: raw.title, count: cards.length };
}

export async function exportProgressJson(db) {
  const payload = await db.exportAll();

  // 1ファイルで完全バックアップできるように、教材も dataset.json 形式で同梱する
  const datasetsV1 = buildDatasetsV1(payload);

  const out = {
    schema: 'memory-progress/v1',
    exportedAt: new Date().toISOString(),
    includes: ['datasetsV1', 'payload'],
    datasetsV1,
    payload,
  };
  return JSON.stringify(out, null, 2);
}

export async function importProgressJson(db, jsonText, { merge = false } = {}) {
  const raw = JSON.parse(jsonText);
  if (!raw || typeof raw !== 'object') throw new Error('JSONが不正です');
  if (raw.schema !== 'memory-progress/v1') throw new Error('schemaが対応外です（memory-progress/v1）');

  // 推奨: payload（IndexedDBの全ストア）が入っている完全バックアップ
  if (raw.payload && typeof raw.payload === 'object') {
    await db.importAll(raw.payload, { merge });
    return { importedAt: new Date().toISOString(), mode: 'payload' };
  }

  // 互換: dataset.json（教材）だけ入っている場合
  if (Array.isArray(raw.datasetsV1) && raw.datasetsV1.length) {
    if (!merge) {
      // payload無しでの上書きは「教材だけ置き換え」になりやすいので、明示的にmerge=false時はクリアして入れる
      await db.importAll({ datasets: [], cards: [], cardState: [], reviews: [], confusions: [], settings: [] }, { merge: false });
    }

    for (const ds of raw.datasetsV1) {
      assertDatasetSchemaV1(ds);
      await importDatasetJson(db, JSON.stringify(ds));
    }
    return { importedAt: new Date().toISOString(), mode: 'datasetsV1' };
  }

  throw new Error('payload も datasetsV1 もありません');
}

function buildDatasetsV1(payload) {
  const metas = Array.isArray(payload.datasets) ? payload.datasets : [];
  const cards = Array.isArray(payload.cards) ? payload.cards : [];

  const cardsByDataset = new Map();
  for (const c of cards) {
    if (!c?.datasetId) continue;
    if (!cardsByDataset.has(c.datasetId)) cardsByDataset.set(c.datasetId, []);
    cardsByDataset.get(c.datasetId).push(c);
  }

  const out = [];
  for (const m of metas) {
    const datasetId = m.datasetId;
    const datasetCards = (cardsByDataset.get(datasetId) || []).map(c => ({
      id: c.cardId,
      topic: c.topic || '',
      question: c.question || '',
      answers: Array.isArray(c.answers) ? c.answers : [],
      explanation: c.explanation || '',
      tags: Array.isArray(c.tags) ? c.tags : [],
      createdAt: c.createdAt || null,
      updatedAt: c.updatedAt || null,
    }));

    out.push({
      schema: 'memory-dataset/v1',
      datasetId,
      title: m.title || '',
      description: m.description || '',
      tags: Array.isArray(m.tags) ? m.tags : [],
      cards: datasetCards,
    });
  }

  return out;
}
