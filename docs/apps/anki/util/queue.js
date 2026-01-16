export function selectNextCard(queue) {
  // MVP: 期限切れ優先 + 軽い混在（同topic連続を避ける程度）
  if (!queue.length) throw new Error('queue is empty');

  // 先頭を基本にしつつ、同topicが続くなら2番手を選ぶ
  const first = queue[0];
  const second = queue[1];
  if (second && first.card.topic && second.card.topic && first.card.topic === second.card.topic) {
    return queue.splice(1, 1)[0];
  }
  return queue.splice(0, 1)[0];
}
