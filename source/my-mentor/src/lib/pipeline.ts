// Weekly pipeline for content posts, Comerze work and product ideas, plus the one small deliverable for today.
// Rows live in `journal_entries` (id pipe:<week>:<n>, kind 'pipeline'), so they sync with no migration. Pure module.
import { type Collections, liveRows } from './collections';
import type { L } from './wisdom';

export type PipeType = 'content' | 'comerze' | 'product';
export type PipeStatus = 'idea' | 'drafted' | 'scheduled' | 'posted';
export const TYPES: { key: PipeType; label: string; emoji: string }[] = [
  { key: 'content', label: 'Content post', emoji: '✍️' },
  { key: 'comerze', label: 'Comerze', emoji: '🛒' },
  { key: 'product', label: 'Digital product', emoji: '🚀' },
];
export const STATUSES: PipeStatus[] = ['idea', 'drafted', 'scheduled', 'posted'];
export type PipeItem = { id: string; week: string; type: PipeType; text: string; status: PipeStatus; createdAt: string };

/** Monday (IST) of the week containing `date`, as YYYY-MM-DD. */
export function weekKey(date: string): string {
  const d = new Date(`${date}T12:00:00+05:30`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * 86400000).toISOString().slice(0, 10);
}
export const pipelineOf = (cols: Collections, week: string): PipeItem[] =>
  liveRows(cols, 'journal_entries', 'createdAt')
    .filter((r) => r.kind === 'pipeline' && r.week === week)
    .map((r) => r as unknown as PipeItem)
    .reverse();
export const pipeRow = (week: string, n: number, type: PipeType, text: string) => ({ id: `pipe:${week}:${n}`, kind: 'pipeline', week, type, text, status: 'idea' as PipeStatus });
export const nextStatus = (s: PipeStatus): PipeStatus => STATUSES[Math.min(STATUSES.length - 1, STATUSES.indexOf(s) + 1)];

/** The single next small deliverable (what Krishna proposes each day). Deterministic from the pipeline state. */
export function nextDeliverable(items: PipeItem[]): L {
  if (!items.length) return { en: 'Add 3 ideas for this week: one post, one Comerze task, one product idea.', hi: 'इस हफ़्ते के 3 आइडिया जोड़ो: एक पोस्ट, एक Comerze काम, एक प्रोडक्ट आइडिया।' };
  const stage = (s: PipeStatus) => items.find((i) => i.status === s);
  const sched = stage('scheduled');
  const drafted = stage('drafted');
  const idea = stage('idea');
  if (drafted) return { en: `Schedule "${drafted.text.slice(0, 40)}" for a weekday. 5 minutes.`, hi: `"${drafted.text.slice(0, 40)}" को किसी कार्यदिवस के लिए शेड्यूल करो। 5 मिनट।` };
  if (idea) return { en: `Ask AI for a first draft of "${idea.text.slice(0, 40)}". 15 minutes.`, hi: `AI से "${idea.text.slice(0, 40)}" का पहला ड्राफ़्ट बनवाओ। 15 मिनट।` };
  if (sched) return { en: `Publish "${sched.text.slice(0, 40)}" today and mark it posted.`, hi: `"${sched.text.slice(0, 40)}" आज पब्लिश करो और पोस्टेड मार्क करो।` };
  return { en: 'This week’s pipeline is posted. Add next week’s ideas now.', hi: 'इस हफ़्ते की पाइपलाइन पूरी हुई। अगले हफ़्ते के आइडिया अभी जोड़ो।' };
}
