// Couple Space daily summary + "push each other". Only a summary is shared (no business numbers, no free text from the journal),
// and only after the person turns sharing on. Stored as couple_items (kind 'checkin' / 'note'), so no database change was needed.
import type { L } from './wisdom';

export type DailySummary = { type: 'daily_summary'; date: string; score: number | null; water: string; oneThingDone: boolean | null; habits: string; detoxFree: boolean | null; woke: string | null };
export const summaryId = (me: string, date: string) => `sum:${me.slice(0, 8)}:${date}`;
export const isSummary = (d: Record<string, unknown>): d is DailySummary => d.type === 'daily_summary' && typeof d.date === 'string';

export function summaryLine(s: DailySummary, who: string): L {
  const parts = [s.score !== null ? `score ${s.score}` : null, `water ${s.water}`, s.oneThingDone === null ? null : s.oneThingDone ? 'One Thing done' : 'One Thing open', `habits ${s.habits}`, s.detoxFree === null ? null : s.detoxFree ? 'detox-free' : 'not detox-free', s.woke ? `woke ${s.woke}` : null].filter(Boolean);
  return {
    en: `${who}: ${parts.join(' · ')}`,
    hi: `${who}: ${[s.score !== null ? `स्कोर ${s.score}` : null, `पानी ${s.water}`, s.oneThingDone === null ? null : s.oneThingDone ? 'One Thing पूरा' : 'One Thing बाकी', `आदतें ${s.habits}`, s.detoxFree === null ? null : s.detoxFree ? 'डिटॉक्स रहा' : 'डिटॉक्स नहीं', s.woke ? `उठे ${s.woke}` : null].filter(Boolean).join(' · ')}`,
  };
}

export type PushMsg = { id: string; text: L };
/** Ready-made pushes one partner can send the other. The sender can also type their own. */
export const PUSHES: Record<'arpan' | 'priya', PushMsg[]> = {
  // sent BY Arpan, TO Priya
  arpan: [
    { id: 'a-gym', text: { en: 'Gym today? You can do it. Even 20 minutes counts.', hi: 'आज जिम? आप कर सकती हो। 20 मिनट भी गिनती में हैं।' } },
    { id: 'a-delegate', text: { en: 'Hand one task to the team today and focus on the client’s happiness.', hi: 'आज एक काम टीम को सौंपो और क्लाइंट की संतुष्टि पर ध्यान दो।' } },
    { id: 'a-proud', text: { en: 'I am proud of you. Keep going.', hi: 'मुझे आप पर गर्व है। चलते रहो।' } },
  ],
  // sent BY Priya, TO Arpan
  priya: [
    { id: 'p-ship', text: { en: 'What will you ship today? Do it before the scrolling starts.', hi: 'आज क्या पूरा करोगे? स्क्रॉल से पहले कर लो।' } },
    { id: 'p-bill', text: { en: 'Raise today’s invoice now. Billing first.', hi: 'आज का इनवॉइस अभी बनाओ। पहले बिलिंग।' } },
    { id: 'p-net', text: { en: 'Call one friend or client today. Your network is your strength.', hi: 'आज एक मित्र या क्लाइंट को फ़ोन करो। आपका नेटवर्क ही आपकी ताक़त है।' } },
  ],
};
