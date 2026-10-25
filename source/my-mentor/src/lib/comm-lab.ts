// Communication Lab: scenario library, fixed rubric, offline (rules-based) scoring, trends, daily drill.
// Pure module. Scores from the AI and from the offline checker use the same 5-criterion rubric (0-5 each).
import { liveRows, type Collections, type Row } from './collections';

export type Area = 'client' | 'seminar' | 'english' | 'assertive';
export const AREAS: { key: Area; label: string; emoji: string; blurb: string }[] = [
  { key: 'client', label: 'Client conversations', emoji: '🤝', blurb: 'Fees, delays, notices, difficult clients' },
  { key: 'seminar', label: 'Seminars & public speaking', emoji: '🎤', blurb: 'Openers, structure, handling questions' },
  { key: 'english', label: 'Professional spoken English', emoji: '🗣️', blurb: 'Clear, confident, simple English' },
  { key: 'assertive', label: 'Assertiveness & family talks', emoji: '🕊️', blurb: 'Say no, set limits, hard conversations' },
];

export type Scenario = { id: string; area: Area; title: string; setup: string; goal: string; level: 1 | 2 | 3; seconds: number };

export const SCENARIOS: Scenario[] = [
  // ---- Client conversations (CA/CS practice)
  { id: 'c1', area: 'client', level: 1, seconds: 60, title: 'Client wants a fee discount', setup: 'A long-time client says your fee for annual compliance is too high and asks for 30% off.', goal: 'Hold your fee politely, explain the value, offer a scoped alternative.' },
  { id: 'c2', area: 'client', level: 2, seconds: 90, title: 'Documents are late again', setup: 'A client has sent GST documents on the 19th for the 20th deadline for the third month running.', goal: 'Set a firm cut-off date without damaging the relationship.' },
  { id: 'c3', area: 'client', level: 2, seconds: 90, title: 'Explaining a notice calmly', setup: 'A panicked client received an income tax notice. Explain what it is, what happens next, and what you need from them.', goal: 'Reduce panic, give 3 clear next steps with dates.' },
  { id: 'c4', area: 'client', level: 3, seconds: 90, title: 'Unpaid invoice follow-up', setup: 'An invoice is 45 days overdue. The client keeps saying "next week".', goal: 'Ask for a specific payment date and agree what happens if it slips.' },
  { id: 'c5', area: 'client', level: 1, seconds: 45, title: 'Introduce your practice', setup: 'At a business meet, a founder asks "So what exactly do you do?"', goal: 'A 30-second pitch: who you help, how, and one proof point.' },
  { id: 'c6', area: 'client', level: 3, seconds: 120, title: 'Saying no to out-of-scope work', setup: 'A client expects you to handle a legal dispute "since you are already doing our books".', goal: 'Decline clearly, explain the boundary, offer a referral or separate scope.' },
  // ---- Seminars & public speaking
  { id: 's1', area: 'seminar', level: 1, seconds: 60, title: 'Open a GST update seminar', setup: 'You have 25 minutes with 40 business owners. Give a 1-minute opening that makes them want to listen.', goal: 'A hook, why it matters to them, and a clear roadmap of 3 points.' },
  { id: 's2', area: 'seminar', level: 2, seconds: 90, title: 'Explain one complex rule simply', setup: 'Explain one tax or compliance rule to a non-finance audience as if to a smart 15-year-old.', goal: 'One example, no jargon, one takeaway.' },
  { id: 's3', area: 'seminar', level: 2, seconds: 60, title: 'Handle a hard question', setup: 'Someone asks a question you are not sure about, in front of the whole room.', goal: 'Stay calm, be honest, offer to follow up with a time.' },
  { id: 's4', area: 'seminar', level: 3, seconds: 90, title: 'Close with a call to action', setup: 'Your session ends in 2 minutes. Close it so people remember the main point and take one action.', goal: 'Summarise in one sentence, give one action, thank them.' },
  { id: 's5', area: 'seminar', level: 1, seconds: 60, title: 'Tell a short client story', setup: 'Illustrate a compliance risk with a short (anonymised) story.', goal: 'Situation, mistake, consequence, lesson in under 60 seconds.' },
  { id: 's6', area: 'seminar', level: 3, seconds: 120, title: 'Recover after losing your place', setup: 'Mid-talk you forget what comes next and the room goes quiet.', goal: 'Pause, recap what you covered, and move on smoothly.' },
  // ---- Professional spoken English
  { id: 'e1', area: 'english', level: 1, seconds: 45, title: 'Introduce yourself professionally', setup: 'You meet a new client on a video call.', goal: 'Name, role, how you help, and a friendly question back.' },
  { id: 'e2', area: 'english', level: 1, seconds: 60, title: 'Give a status update', setup: 'Update a client on their pending work in simple, complete sentences.', goal: 'What is done, what is pending, what you need, by when.' },
  { id: 'e3', area: 'english', level: 2, seconds: 60, title: 'Politely disagree', setup: 'A colleague proposes an approach you believe is risky.', goal: 'Disagree respectfully using phrases like "I see it slightly differently".' },
  { id: 'e4', area: 'english', level: 2, seconds: 90, title: 'Explain a delay', setup: 'A filing will be two days late because of portal issues.', goal: 'Apologise once, explain briefly, give the new date and your plan.' },
  { id: 'e5', area: 'english', level: 3, seconds: 90, title: 'Negotiate a deadline', setup: 'A client wants a report in 2 days; realistically you need 5.', goal: 'Propose a middle path and confirm in clear English.' },
  { id: 'e6', area: 'english', level: 2, seconds: 60, title: 'Describe your week aloud', setup: 'Speak for one minute about your week without stopping or switching languages.', goal: 'Fluency, linking words, no long pauses.' },
  // ---- Assertiveness & family talks
  { id: 'a1', area: 'assertive', level: 1, seconds: 45, title: 'Say no to an extra request', setup: 'A relative asks you to take on one more favour when you are already stretched.', goal: 'A kind, clear no without over-explaining.' },
  { id: 'a2', area: 'assertive', level: 2, seconds: 90, title: 'Ask for uninterrupted work time', setup: 'You need two protected hours daily for focused work at home.', goal: 'State the need, the benefit to the family, and a specific proposal.' },
  { id: 'a3', area: 'assertive', level: 2, seconds: 90, title: 'Raise a recurring irritation', setup: 'Something small keeps repeating and it is building resentment.', goal: 'Use "When X happens, I feel Y, I would like Z" without blame.' },
  { id: 'a4', area: 'assertive', level: 3, seconds: 120, title: 'Respond when criticised', setup: 'Someone you respect criticises how you spend your time.', goal: 'Listen, acknowledge what is fair, state your view calmly.' },
  { id: 'a5', area: 'assertive', level: 3, seconds: 120, title: 'Apologise and repair', setup: 'You snapped at a family member during a stressful day.', goal: 'Own it specifically, no "but", offer a repair.' },
  { id: 'a6', area: 'assertive', level: 1, seconds: 60, title: 'Ask for help', setup: 'You need support with household or work tasks this week.', goal: 'Ask for one concrete thing with a time.' },
];

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id);

// ---------- rubric ----------
export const CRITERIA = [
  { key: 'clarity', label: 'Clarity', hint: 'Simple words, one idea per sentence' },
  { key: 'structure', label: 'Structure', hint: 'Point, reason, example, next step' },
  { key: 'tone', label: 'Tone', hint: 'Respectful, calm, confident' },
  { key: 'confidence', label: 'Confidence', hint: 'Few fillers, no heavy hedging' },
  { key: 'relevance', label: 'Relevance', hint: 'Answers the situation and goal' },
] as const;
export type CriterionKey = (typeof CRITERIA)[number]['key'];
export type Scores = Record<CriterionKey, number>;

export const percentOf = (s: Scores) => Math.round((CRITERIA.reduce((a, c) => a + (s[c.key] ?? 0), 0) / (CRITERIA.length * 5)) * 100);

const FILLERS = /\b(um+|uh+|er+|like|basically|actually|you know|i mean|kind of|sort of|so yeah)\b/gi;
const HEDGES = /\b(maybe|i think|i guess|probably|sorry to bother|just wanted|i was wondering)\b/gi;
const STRUCTURE = /\b(first|second|third|because|for example|for instance|so that|therefore|next step|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|\d{1,2}(st|nd|rd|th)?))\b/gi;
const POLITE = /\b(please|thank|appreciate|understand|happy to|glad to|let me|would you)\b/gi;

export type OfflineResult = { scores: Scores; strengths: string[]; improve: string[]; rewrite: string; words: number; fillers: number; source: 'rules' };

/** Honest, limited scoring that works with no AI: it measures only what can be counted. Labelled as "basic check". */
export function offlineScore(text: string, sc?: Scenario): OfflineResult {
  const t = text.trim();
  const words = t ? t.split(/\s+/).length : 0;
  const sentences = Math.max(1, (t.match(/[.!?।]+/g) ?? []).length || 1);
  const avgLen = words / sentences;
  const fillers = (t.match(FILLERS) ?? []).length;
  const hedges = (t.match(HEDGES) ?? []).length;
  const struct = (t.match(STRUCTURE) ?? []).length;
  const polite = (t.match(POLITE) ?? []).length;
  const target = sc ? Math.round(sc.seconds * 2.2) : 100; // ~130 wpm speaking
  const lenRatio = words / target;
  const clamp = (n: number) => Math.max(0, Math.min(5, Math.round(n)));

  const scores: Scores = {
    clarity: clamp(avgLen <= 18 ? 5 : avgLen <= 25 ? 4 : avgLen <= 32 ? 3 : 2),
    structure: clamp(1 + struct * 1.2 + (sentences >= 3 ? 1 : 0)),
    tone: clamp(2 + polite * 1.2 - (hedges > 3 ? 1 : 0)),
    confidence: clamp(5 - fillers * 0.7 - hedges * 0.5),
    relevance: clamp(words === 0 ? 0 : lenRatio < 0.3 ? 1.5 : lenRatio < 0.6 ? 3 : lenRatio <= 1.6 ? 4 : 3),
  };
  if (words < 8) for (const k of Object.keys(scores) as CriterionKey[]) scores[k] = Math.min(scores[k], 1);

  const strengths: string[] = [];
  const improve: string[] = [];
  if (scores.clarity >= 4) strengths.push('Your sentences are short and easy to follow.');
  if (fillers === 0 && words >= 20) strengths.push('No filler words in this answer.');
  if (struct >= 2) strengths.push('You used linking words and a clear order.');
  if (polite >= 2) strengths.push('Polite, respectful wording.');
  if (fillers >= 2) improve.push(`Filler words: ${fillers} found ("um", "like", "basically"...). Pause silently instead.`);
  if (hedges >= 2) improve.push('Cut softeners like "I think" and "maybe" when you are sure.');
  if (avgLen > 25) improve.push(`Sentences average ${Math.round(avgLen)} words. Aim for under 20.`);
  if (struct < 2) improve.push('Add structure: point, reason, one example, next step with a date.');
  if (lenRatio < 0.5 && sc) improve.push(`Short for this scenario (${words} words; aim near ${target}).`);
  if (!strengths.length) strengths.push(words >= 8 ? 'You gave a complete attempt. That is how improvement starts.' : 'You started. Try a longer answer next time.');
  return { scores, strengths: strengths.slice(0, 3), improve: improve.slice(0, 3), rewrite: '', words, fillers, source: 'rules' };
}

// ---------- attempts & trends ----------
export type Attempt = Row & {
  scenarioId: string;
  area: Area;
  transcript: string;
  scores: Scores;
  percent: number;
  source: 'ai' | 'rules';
  strengths?: string[];
  improve?: string[];
  rewrite?: string;
  voice?: boolean;
  seconds?: number;
};

export const attemptsOf = (cols: Collections) => liveRows<Attempt>(cols, 'comm_attempts', 'createdAt');

export function trend(attempts: Attempt[]) {
  const asc = [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const avg = (xs: Attempt[]) => (xs.length ? Math.round(xs.reduce((a, x) => a + x.percent, 0) / xs.length) : null);
  const first = avg(asc.slice(0, 3));
  const last = avg(asc.slice(-3));
  const byArea = AREAS.map((a) => ({ area: a.key, count: asc.filter((x) => x.area === a.key).length, avg: avg(asc.filter((x) => x.area === a.key)) }));
  const byCriterion = CRITERIA.map((c) => ({ key: c.key, avg: asc.length ? Math.round((asc.reduce((n, x) => n + (x.scores?.[c.key] ?? 0), 0) / asc.length) * 10) / 10 : null }));
  const weakest = [...byCriterion].filter((c) => c.avg !== null).sort((a, b) => (a.avg as number) - (b.avg as number))[0];
  return { count: asc.length, first, last, change: first !== null && last !== null && asc.length >= 6 ? last - first : null, byArea, byCriterion, weakest, series: asc.slice(-12).map((x) => x.percent) };
}

/** A 5-minute drill: 3 scenarios, choosing ones not yet attempted first, shifted by date so it changes daily. */
export function dailyDrill(attempts: Attempt[], today: string): Scenario[] {
  const done = new Set(attempts.map((a) => a.scenarioId));
  const seed = Number(today.replaceAll('-', '')) % SCENARIOS.length;
  const rotated = [...SCENARIOS.slice(seed), ...SCENARIOS.slice(0, seed)];
  const fresh = rotated.filter((s) => !done.has(s.id));
  const pool = fresh.length >= 3 ? fresh : rotated;
  const picked: Scenario[] = [];
  for (const s of pool) {
    if (picked.length < 3 && !picked.some((p) => p.area === s.area)) picked.push(s);
  }
  for (const s of pool) if (picked.length < 3 && !picked.includes(s)) picked.push(s);
  return picked;
}

/** Weekly exercise: area rotates by week; a different concrete task each week. */
export const WEEKLY_EXERCISES: Record<Area, string[]> = {
  client: ['Record yourself explaining your fee in 60 seconds, then redo it 20% shorter.', 'Write the first two sentences of every client message this week as the conclusion, then the detail.', 'Practise one polite "no" and use it for real once.'],
  seminar: ['Rehearse your opener 5 times out loud, without notes.', 'Replace one slide or point with a 30-second story.', 'Ask a friend one hard question and answer it in 20 seconds.'],
  english: ['Speak for 2 minutes daily about your day. No stopping, no switching language.', 'Learn 3 polite disagreement phrases and use each once.', 'Replace 5 filler words per day with a silent pause.'],
  assertive: ['Use "I would like..." instead of "I just wanted to ask..." in three real situations.', 'Pause for 3 seconds before answering a request. Then say yes, no, or "let me check".', 'Say one honest appreciation and one honest request to a family member.'],
};

export function weeklyExercise(today: string) {
  const d = new Date(`${today}T12:00:00+05:30`);
  const week = Math.floor((d.getTime() - new Date('2026-01-05T00:00:00+05:30').getTime()) / (7 * 86400000));
  const area = AREAS[((week % AREAS.length) + AREAS.length) % AREAS.length];
  const list = WEEKLY_EXERCISES[area.key];
  return { area, text: list[((Math.floor(week / AREAS.length) % list.length) + list.length) % list.length] };
}
