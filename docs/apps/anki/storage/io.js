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
  const datasets = await db.listDatasets();
  const out = {
    schema: 'memory-progress/v1',
    exportedAt: new Date().toISOString(),
    datasets,
  };
  return JSON.stringify(out, null, 2);
}
