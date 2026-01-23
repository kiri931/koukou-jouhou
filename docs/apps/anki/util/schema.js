export function assertDatasetSchemaV1(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('JSONが不正です');
  if (obj.schema !== 'memory-dataset/v1') throw new Error('schemaが対応外です（memory-dataset/v1）');
  if (!isUuid(obj.datasetId)) throw new Error('datasetIdがUUIDではありません');
  if (typeof obj.title !== 'string' || !obj.title.trim()) throw new Error('titleがありません');
  if (!Array.isArray(obj.cards)) throw new Error('cardsが配列ではありません');
  for (const c of obj.cards) {
    if (!c || typeof c !== 'object') throw new Error('cardが不正です');
    if (!isUuid(c.id)) throw new Error('card.idがUUIDではありません');
    if (typeof c.question !== 'string') throw new Error('card.questionが不正です');
    if (!Array.isArray(c.answers) || !c.answers.length) throw new Error('card.answersが不正です');
  }
}

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
