export function selectNextCard(queue, { lastTopic = null, sampleSize = 6 } = {}) {
  // MVP: 期限切れ優先（queueは事前に優先順で並んでいる想定）
  // + 軽い混在（直前と同topicを避ける）
  if (!queue.length) throw new Error('queue is empty');

  const headN = Math.min(queue.length, Math.max(2, sampleSize));
  if (!lastTopic) return queue[0];

  for (let i = 0; i < headN; i++) {
    const it = queue[i];
    const topic = it?.card?.topic || null;
    if (!topic || topic !== lastTopic) return it;
  }
  return queue[0];
}
