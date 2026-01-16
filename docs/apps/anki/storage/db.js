import { clamp } from '../util/math.js';
import { computeRetrievability } from '../util/fsrs.js';

const DB_NAME = 'memory_app_db';
const DB_VERSION = 1;

export async function openDb() {
  const idb = await open();

  return {
    async listDatasets() {
      const tx = idb.transaction('datasets', 'readonly');
      const items = await reqToPromise(tx.objectStore('datasets').getAll());
      return items.sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''));
    },

    async upsertDatasetMeta(meta) {
      const tx = idb.transaction('datasets', 'readwrite');
      await reqToPromise(tx.objectStore('datasets').put(meta));
      await txDone(tx);
    },

    async bulkPutCards(cards) {
      const tx = idb.transaction('cards', 'readwrite');
      const store = tx.objectStore('cards');
      for (const c of cards) store.put(c);
      await txDone(tx);
    },

    async getCard(datasetId, cardId) {
      const tx = idb.transaction('cards', 'readonly');
      return await reqToPromise(tx.objectStore('cards').get([datasetId, cardId]));
    },

    async getCardState(datasetId, cardId) {
      const tx = idb.transaction('cardState', 'readonly');
      return await reqToPromise(tx.objectStore('cardState').get([datasetId, cardId]));
    },

    async upsertCardState(datasetId, cardId, patch) {
      const tx = idb.transaction('cardState', 'readwrite');
      const store = tx.objectStore('cardState');
      const key = [datasetId, cardId];
      const cur = (await reqToPromise(store.get(key))) || { datasetId, cardId };
      const merged = { ...cur, ...patch, datasetId, cardId };
      store.put(merged);
      await txDone(tx);
    },

    async appendReview(review) {
      const tx = idb.transaction('reviews', 'readwrite');
      tx.objectStore('reviews').add({
        ...review,
        id: crypto.randomUUID(),
      });
      await txDone(tx);
    },

    async countDue(datasetId) {
      const now = Date.now();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const todayEnd = endOfDay.getTime();

      const txCards = idb.transaction(['cards', 'cardState'], 'readonly');
      const cardStore = txCards.objectStore('cards');
      const stateStore = txCards.objectStore('cardState');

      const cards = await reqToPromise(cardStore.index('byDataset').getAll(datasetId));
      let overdue = 0;
      let today = 0;

      for (const c of cards) {
        const st = await reqToPromise(stateStore.get([datasetId, c.cardId]));
        const dueAt = st?.dueAt ? Date.parse(st.dueAt) : 0;
        const isDue = !dueAt || dueAt <= todayEnd;
        if (!isDue) continue;
        if (!dueAt || dueAt <= now) overdue += 1;
        else today += 1;
      }

      return { overdue, today, total: cards.length };
    },

    async buildDueQueue(datasetId) {
      const now = Date.now();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const todayEnd = endOfDay.getTime();

      const tx = idb.transaction(['cards', 'cardState'], 'readonly');
      const cardStore = tx.objectStore('cards');
      const stateStore = tx.objectStore('cardState');

      const cards = await reqToPromise(cardStore.index('byDataset').getAll(datasetId));
      const out = [];
      for (const c of cards) {
        const st = await reqToPromise(stateStore.get([datasetId, c.cardId]));
        const dueAtMs = st?.dueAt ? Date.parse(st.dueAt) : 0;
        const isDue = !dueAtMs || dueAtMs <= todayEnd;
        if (!isDue) continue;
        const priority = !dueAtMs ? 999999 : clamp(0, 999999, Math.round((now - dueAtMs) / (1000 * 60)));
        out.push({
          card: {
            id: c.cardId,
            topic: c.topic,
            question: c.question,
            answers: c.answers,
          },
          dueAtMs,
          priority,
        });
      }

      out.sort((a, b) => b.priority - a.priority);
      return out;
    },

    async detectConfusion(datasetId, answerRaw, currentCardId) {
      const ans = answerRaw || '';
      if (!ans.trim()) return null;

      const tx = idb.transaction('cards', 'readonly');
      const cards = await reqToPromise(tx.objectStore('cards').index('byDataset').getAll(datasetId));
      const norm = normalize(ans);

      for (const c of cards) {
        if (c.cardId === currentCardId) continue;
        const answers = Array.isArray(c.answers) ? c.answers : [];
        for (const a of answers) {
          if (normalize(String(a)) === norm) return { cardId: c.cardId };
        }
      }
      return null;
    },

    async bumpConfusion(datasetId, cardA, cardB) {
      const [a, b] = cardA < cardB ? [cardA, cardB] : [cardB, cardA];
      const key = [datasetId, a, b];
      const tx = idb.transaction('confusions', 'readwrite');
      const store = tx.objectStore('confusions');
      const cur = (await reqToPromise(store.get(key))) || { datasetId, cardA: a, cardB: b, score: 0 };
      cur.score += 1;
      store.put(cur);
      await txDone(tx);
    },

    async listTopConfusions(datasetId, limit = 10) {
      const tx = idb.transaction(['confusions', 'cards'], 'readonly');
      const confStore = tx.objectStore('confusions');
      const all = await reqToPromise(confStore.index('byDataset').getAll(datasetId));
      all.sort((x, y) => (y.score || 0) - (x.score || 0));

      const cardsStore = tx.objectStore('cards');
      const top = all.slice(0, limit);
      const result = [];
      for (const c of top) {
        const a = await reqToPromise(cardsStore.get([datasetId, c.cardA]));
        const b = await reqToPromise(cardsStore.get([datasetId, c.cardB]));
        const label = `${a?.question || c.cardA} ↔ ${b?.question || c.cardB}`;
        result.push({
          ...c,
          pairLabel: label,
        });
      }
      return result;
    },

    async computeRetrievability(datasetId) {
      const now = new Date();
      const tx = idb.transaction('cardState', 'readonly');
      const all = await reqToPromise(tx.objectStore('cardState').index('byDataset').getAll(datasetId));
      if (!all.length) return { avg: 0 };

      let sum = 0;
      let n = 0;
      for (const st of all) {
        if (!st?.lastReviewAt || !st?.stability) continue;
        const r = computeRetrievability({
          now,
          lastReviewAt: new Date(st.lastReviewAt),
          stability: st.stability,
        });
        sum += r;
        n += 1;
      }
      return { avg: n ? sum / n : 0 };
    },

    async getSettings() {
      const tx = idb.transaction('settings', 'readonly');
      return (await reqToPromise(tx.objectStore('settings').get('app'))) || { targetR: 0.85, examDate: null };
    },

    async setSettings(patch) {
      const tx = idb.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const cur = (await reqToPromise(store.get('app'))) || { id: 'app', targetR: 0.85, examDate: null };
      store.put({ ...cur, ...patch, id: 'app' });
      await txDone(tx);
    },

    async nuke() {
      idb.close();
      await deleteDb();
      // 再オープンは呼び出し元でやるのが理想だが、MVPではリロード前提
      location.reload();
    },
  };
}

function normalize(s) {
  return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      const datasets = db.createObjectStore('datasets', { keyPath: 'datasetId' });
      datasets.createIndex('byImportedAt', 'importedAt', { unique: false });

      const cards = db.createObjectStore('cards', { keyPath: ['datasetId', 'cardId'] });
      cards.createIndex('byDataset', 'datasetId', { unique: false });

      const cardState = db.createObjectStore('cardState', { keyPath: ['datasetId', 'cardId'] });
      cardState.createIndex('byDataset', 'datasetId', { unique: false });
      cardState.createIndex('byDueAt', 'dueAt', { unique: false });

      db.createObjectStore('reviews', { keyPath: 'id' });

      const confusions = db.createObjectStore('confusions', { keyPath: ['datasetId', 'cardA', 'cardB'] });
      confusions.createIndex('byDataset', 'datasetId', { unique: false });

      db.createObjectStore('settings', { keyPath: 'id' });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
