export function normalizeAnswer(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function scoreAnswer(input, answers) {
  const actual = String(input ?? '');
  const expectedList = Array.isArray(answers) ? answers.map(String) : [];
  const expected = expectedList[0] ?? '';

  const a = normalizeAnswer(actual);
  const ok = expectedList.some(x => normalizeAnswer(x) === a);

  return {
    correct: ok,
    expected,
    actual,
  };
}
