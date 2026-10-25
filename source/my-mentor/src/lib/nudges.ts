// Nudge engine: short Hinglish one-liners, one action each, written in a "Chanakya" voice (honest, strategic, not harsh).
// Pure and template-based so it works in the background with no AI call; the AI only refreshes the template pool when the app opens.
// Arpan and Priya have separate pools and separate rules. A nudge is never sent outside 06:00–23:00 IST.
import type { DiscConfig, Role } from './discipline';

export type Slot = 'wake' | 'morning' | 'afternoon' | 'evening' | 'night';
export type Nudge = { id: string; role: Role; slot: Slot; title: string; body: string; route: string };

export type NudgeCtx = {
  role: Role;
  hour: number; // IST 0..23
  minute: number;
  name?: string;
  oneThing?: string;
  oneThingDone?: boolean;
  openToday: number; // pending planner items + commitments due today
  firstPending?: string;
  waterGlasses: number;
  waterTarget: number;
  /** Priya only: set when she has answered the two mandatory questions today. */
  discussedWithArpan?: boolean;
  delegatingToday?: boolean;
};

export const slotOf = (hour: number): Slot | null => {
  if (hour < 6 || hour >= 23) return null;
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
};

const short = (s: string | undefined, n = 40) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : (s ?? ''));

// ---------- Arpan ----------
function arpanPool(c: NudgeCtx): Omit<Nudge, 'role'>[] {
  const slot = slotOf(c.hour);
  if (!slot) return [];
  const one = short(c.oneThing);
  const water = c.waterGlasses < Math.ceil(c.waterTarget * Math.min(1, (c.hour - 5) / 16))
    ? [{ id: 'a-water', slot, title: 'Paani 💧', body: `${c.waterGlasses}/${c.waterTarget} glass hue. Ek glass abhi, phir kaam.`, route: '/' }]
    : [];
  const morning: Omit<Nudge, 'role'>[] = [
    { id: 'a-m1', slot: 'morning', title: 'Pehle kaam', body: c.oneThing && !c.oneThingDone ? `"${one}": pehle 25 minute, phone door.` : 'Aaj ka One Thing likho. 1 line, abhi.', route: '/' },
    { id: 'a-m2', slot: 'morning', title: 'Client / GST', body: c.firstPending ? `Pehle yeh: ${short(c.firstPending)}. Baaki baad mein.` : 'Pehla client/GST kaam chuno aur 25 minute lagao.', route: '/planner' },
    { id: 'a-m3', slot: 'morning', title: 'Execute', body: 'Doosron ko motivate karne se pehle apna kaam. Pehle tu ship kar.', route: '/' },
  ];
  const afternoon: Omit<Nudge, 'role'>[] = [
    { id: 'a-a1', slot: 'afternoon', title: 'Timesheet', body: 'Aaj ka time log bhara? 2 minute, abhi.', route: '/work' },
    { id: 'a-a2', slot: 'afternoon', title: 'Billing', body: 'Aaj kitna bill kiya? Target 10–50 hazaar/din ka hai, ek invoice nikalo.', route: '/work' },
    { id: 'a-a3', slot: 'afternoon', title: 'AI se leverage', body: 'Ye drafting AI se karwao. Tera time sirf review ke liye hai.', route: '/mentor' },
    { id: 'a-a4', slot: 'afternoon', title: 'Agle 15 minute', body: 'Kya yeh agla 15 minute sabse best use hai? Nahi, toh abhi badlo.', route: '/' },
  ];
  const evening: Omit<Nudge, 'role'>[] = [
    { id: 'a-e1', slot: 'evening', title: 'Kuch meaningful banao', body: 'Ek content post ya product idea ka 20 minute. Scroll nahi, build.', route: '/grow' },
    { id: 'a-e2', slot: 'evening', title: 'Networking', body: 'Ek dost/client ko call ya dinner ka plan karo. Network hi net worth hai.', route: '/' },
    { id: 'a-e3', slot: 'evening', title: 'Chanakya kehte hain', body: 'Samay ka sahi upyog hi sabse bada dhan hai. Aaj ka kaam aaj.', route: '/' },
    { id: 'a-e4', slot: 'evening', title: 'Comerze / AI', body: c.openToday > 0 ? `${c.openToday} kaam baaki. Ek khatam karo, phir build.` : 'Aaj ka kaam ho gaya. Ab Comerze ya AI product ka agla chhota step.', route: '/grow' },
  ];
  const night: Omit<Nudge, 'role'>[] = [
    { id: 'a-n1', slot: 'night', title: 'Detox', body: 'Screen band karne ka waqt. Kal ka din aaj se behtar banega, agar abhi sone gaye.', route: '/' },
  ];
  const pool = slot === 'morning' ? morning : slot === 'afternoon' ? afternoon : slot === 'evening' ? evening : night;
  return [...pool, ...water];
}

// ---------- Priya ----------
// Rules (from the owner's brief): every message names Arpan, states the two mandatory questions (discussed with Arpan?
// delegating or working alone?), praises first, and teaches "kaam karna nahi, karwana hai". Hindi/Hinglish, kind and firm.
// Health lines are honest and gentle: no weight talk, no scare tactics, no body comments.
const PRIYA_TAIL = 'Arpan se baat hui? Aaj kaam karwa rahi ho ya akeli kar rahi ho?';
function priyaPool(c: NudgeCtx): Omit<Nudge, 'role'>[] {
  const slot = slotOf(c.hour);
  if (!slot) return [];
  const t = (s: string) => `${s} ${PRIYA_TAIL}`;
  const morning: Omit<Nudge, 'role'>[] = [
    { id: 'p-m1', slot: 'morning', title: 'Aap bahut accha kar rahi ho 🌸', body: t('Aaj ek kaam kisi aur ko saunp do aur check karo. Manager banna hai, typewriter nahi.'), route: '/couple' },
    { id: 'p-m2', slot: 'morning', title: 'Subah ki shuruaat', body: t('10 minute walk ya gehri saans abhi. Aapki sehat hi aapki team ki taakat hai.'), route: '/couple' },
  ];
  const afternoon: Omit<Nudge, 'role'>[] = [
    { id: 'p-a1', slot: 'afternoon', title: 'Kaam karna nahi, karwana hai', body: t('Jo kaam roz aap khud karti ho, usme se ek kaam kisi ko do aur shaam ko check karo.'), route: '/couple' },
    { id: 'p-a2', slot: 'afternoon', title: 'Shabaash!', body: t('Ghar aur bachchon ko sambhalna bada kaam hai, aap acchi ho. Ab thoda bada socho: aapka partner-level kaam kya hai?'), route: '/couple' },
  ];
  const evening: Omit<Nudge, 'role'>[] = [
    { id: 'p-e1', slot: 'evening', title: 'Bachchon ke saath quality time', body: t('Aaj bachchon ko 20 minute poora dhyan diya? Phone door, bas saath.'), route: '/couple' },
    { id: 'p-e2', slot: 'evening', title: 'Arpan ke saath 10 minute', body: t('Aaj Arpan ko time diya? Din ke kaam aur kal ki planning par 10 minute baat karo.'), route: '/couple' },
    { id: 'p-e3', slot: 'evening', title: 'Aise hi chalta raha toh?', body: t('Accha kar rahi ho, par sirf kaam karte rehne se kal kuch nahi badlega. Ek kaam delegate karo.'), route: '/couple' },
  ];
  const night: Omit<Nudge, 'role'>[] = [
    { id: 'p-n1', slot: 'night', title: 'Aaj ka din', body: t('Aaj jo accha kiya uspar garv karo. Kal ek aur kaam delegate karenge.'), route: '/couple' },
  ];
  return slot === 'morning' ? morning : slot === 'afternoon' ? afternoon : slot === 'evening' ? evening : night;
}

/** Deterministic pick so the same quarter-hour always gives the same line, and consecutive lines differ. */
export function pickNudge(c: NudgeCtx): Nudge | null {
  const pool = c.role === 'priya' ? priyaPool(c) : arpanPool(c);
  if (!pool.length) return null;
  const idx = (c.hour * 4 + Math.floor(c.minute / 15)) % pool.length;
  return { ...pool[idx], role: c.role };
}

// ---------- Adaptive spacing ----------
/**
 * Minutes between nudges right now. Base is the user's setting (15/30/60).
 * - 3+ ignored in a row: double it (never nag an ignored person harder).
 * - On a streak (One Thing done and habits going): quiet, 2 hours.
 */
export function nudgeGap(cfg: Pick<DiscConfig, 'nudgeEvery'>, ignoredInRow: number, onStreak: boolean): number {
  if (onStreak) return 120;
  return ignoredInRow >= 3 ? cfg.nudgeEvery * 2 : cfg.nudgeEvery;
}

/** Times (IST minutes of the day) for a day's nudges between 06:00 and 23:00. */
export function nudgeTimes(gap: number, fromMin = 6 * 60, toMin = 23 * 60): number[] {
  const out: number[] = [];
  for (let m = Math.ceil(fromMin / gap) * gap; m < toMin; m += gap) out.push(m);
  return out;
}

// ---------- Wake push (Arpan) ----------
export function lateWakeLine(time: string, lateMin: number): string | null {
  if (lateMin < 30) return null;
  return `Aaj ${time} baje uthe. Kal ka din mushkil hoga agar aaj bhi aise gaya. Pehla kaam: 10 min, abhi.`;
}

// ---------- Night: why wasn't it done ----------
/** Evening accountability line from what is still pending (used for the 21:00+ notification and Krishna's opening line). */
export function eveningAccountability(role: Role, pending: string[], oneThingDone: boolean): { title: string; body: string } {
  if (role === 'priya')
    return {
      title: 'Aaj ka hisaab',
      body: pending.length
        ? `${pending.length} kaam baaki hain. Kya Arpan se baat hui aur kisi ko saunpa? Manager ki tarah check karo, khud mat karo.`
        : 'Aaj sab ho gaya, shabaash! Arpan ko bhi batao. Kal ek aur kaam delegate karo.',
    };
  if (!pending.length && oneThingDone) return { title: 'Aaj ka hisaab', body: 'One Thing ho gaya. Ab kal ka One Thing abhi likh do.' };
  return {
    title: 'Aaj kyun nahi hua?',
    body: `${pending.length || 'Kuch'} kaam baaki: ${short(pending[0], 30)}. Ek line mein likho kyun. Aise chalta raha toh 10 lakh/month ka target door rahega.`,
  };
}

/** Time-use check: share of logged minutes that went to advising/motivating others vs billable/building. Returns a flag when the cap is crossed. */
export function timeUseFlag(minutes: { billable: number; building: number; advising: number; other: number }, capPct = 20): { flag: boolean; advisingPct: number } {
  const total = minutes.billable + minutes.building + minutes.advising + minutes.other;
  const advisingPct = total ? Math.round((minutes.advising / total) * 100) : 0;
  return { flag: total >= 60 && advisingPct > capPct, advisingPct };
}
