import { clamp } from './math.js';

// FSRS v4 default weights (spec)
const W = [
  0.4, 0.6, 2.4, 5.8,
  4.93, 0.94, 0.86, 0.01,
  1.49, 0.14, 0.94, 2.18,
  0.05, 0.34, 1.26, 0.29,
  2.61,
];

// R(t,S) = (1 + t/(9S))^-1
export function computeRetrievability({ now, lastReviewAt, stability }) {
  const tDays = Math.max(0, (now.getTime() - lastReviewAt.getTime()) / (1000 * 60 * 60 * 24));
  const S = Math.max(0.1, Number(stability) || 0.1);
  return 1 / (1 + (tDays / (9 * S)));
}

export function intervalFromTargetR({ targetR, stability }) {
  const r = clamp(0.01, 0.99, Number(targetR) || 0.85);
  const S = Math.max(0.1, Number(stability) || 0.1);
  return 9 * S * (1 / r - 1);
}

function targetRWithExam({ baseR, examDateIso, now }) {
  const base = clamp(0.01, 0.99, Number(baseR) || 0.85);
  if (!examDateIso) return base;
  const exam = Date.parse(examDateIso);
  if (!Number.isFinite(exam)) return base;
  const days = Math.ceil((exam - now.getTime()) / (1000 * 60 * 60 * 24));

  if (days > 30) return 0.85;
  if (days >= 15) return 0.90;
  if (days >= 4) return 0.93;
  return 0.96;
}

export function fsrsScheduleNext({ now, cardState, grade, baseTargetR = 0.85, examDateIso = null }) {
  // grade: 1..4 (Again/Hard/Good/Easy)
  const G = clamp(1, 4, Number(grade) || 1);

  const lastReviewAt = cardState?.lastReviewAt ? new Date(cardState.lastReviewAt) : null;
  const S = Math.max(0.1, Number(cardState?.stability) || 0);
  const D = clamp(1, 10, Number(cardState?.difficulty) || 0);
  const reps = Number(cardState?.reps || 0);
  const lapses = Number(cardState?.lapses || 0);

  // 初回レビュー（状態なし扱い）
  if (!lastReviewAt || !S || !D || !Number.isFinite(S) || !Number.isFinite(D)) {
    const S0 = W[G - 1];
    const D0 = clamp(1, 10, W[4] - (G - 3) * W[5]);
    const targetR = targetRWithExam({ baseR: baseTargetR, examDateIso, now });
    const nextDays = clamp(0.0, 3650, intervalFromTargetR({ targetR, stability: S0 }));
    const dueAt = clipDueAt({
      now,
      dueAtMs: now.getTime() + nextDays * 24 * 60 * 60 * 1000,
      examDateIso,
    });
    return {
      stability: Math.max(0.1, S0),
      difficulty: D0,
      lastReviewAt: now.toISOString(),
      dueAt: new Date(dueAt).toISOString(),
      reps: reps + 1,
      lapses,
    };
  }

  const R = computeRetrievability({ now, lastReviewAt, stability: S });

  // 難易度更新
  const D0Good = clamp(1, 10, W[4] - (3 - 3) * W[5]);
  let Dp = W[7] * D0Good + (1 - W[7]) * (D - W[6] * (G - 3));
  Dp = clamp(1, 10, Dp);

  let Sp;
  if (G === 1) {
    // 失敗
    Sp = W[11] * Math.pow(Dp, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R));
  } else {
    // 成功
    const hardFactor = G === 2 ? W[15] : 1;
    const easyFactor = G === 4 ? W[16] : 1;
    const inner =
      Math.exp(W[8]) * (11 - Dp) * Math.pow(S, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * hardFactor * easyFactor + 1;
    Sp = S * inner;
  }

  Sp = Math.max(0.1, Sp);

  // 目標保持率（試験日考慮）
  const targetR = targetRWithExam({ baseR: baseTargetR, examDateIso, now });
  const nextDays = clamp(0.0, 3650, intervalFromTargetR({ targetR, stability: Sp }));
  const dueAtMs = clipDueAt({
    now,
    dueAtMs: now.getTime() + nextDays * 24 * 60 * 60 * 1000,
    examDateIso,
  });

  return {
    stability: Sp,
    difficulty: Dp,
    lastReviewAt: now.toISOString(),
    dueAt: new Date(dueAtMs).toISOString(),
    reps: reps + 1,
    lapses: lapses + (G === 1 ? 1 : 0),
  };
}

function clipDueAt({ now, dueAtMs, examDateIso }) {
  let ms = Math.max(now.getTime(), Number(dueAtMs) || now.getTime());
  if (!examDateIso) return ms;
  const exam = Date.parse(examDateIso);
  if (!Number.isFinite(exam)) return ms;

  const clip = exam - 24 * 60 * 60 * 1000;
  if (ms > clip) ms = clip;
  if (ms < now.getTime()) ms = now.getTime();
  return ms;
}
