// Nudge engine: short one-liners in Hindi, English or both, in Krishna's voice (a guru + today's Chanakya: honest, strategic, not harsh).
// Pure and template-based so it works in the background with no AI call. Arpan and Priya have separate pools and rules.
// A nudge is never produced outside 06:00–23:00 IST. Sundays have their own plan (no rest: each other, billing, gyaan, content).
import type { DiscConfig, Role } from './discipline';
import type { L } from './wisdom';

export type NudgeLang = 'hi' | 'en' | 'both';
export type Slot = 'morning' | 'afternoon' | 'evening' | 'night';
export type Nudge = { id: string; role: Role; slot: Slot; title: string; body: string; route: string };

export type NudgeCtx = {
  role: Role;
  lang?: NudgeLang;
  hour: number; // IST 0..23
  minute: number;
  weekday?: number; // 0 = Sunday (IST)
  oneThing?: string;
  oneThingDone?: boolean;
  openToday: number; // pending planner items + commitments due today
  firstPending?: string;
  waterGlasses: number;
  waterTarget: number;
  /** Priya's chosen health goals (gym first). */
  healthGoals?: string[];
  /** Arpan: the person most overdue for a call/dinner, if any. */
  duePerson?: { name: string; days: number | null };
  /** Arpan: tentative billing this month against the target. */
  billing?: { total: number; target: number; needPerDay: number; todayEntered: boolean };
};

type T = { id: string; slot: Slot; title: L; body: L; route: string };

/** Pick the language(s). "both" shows Hindi then English on a new line. */
export const say = (l: L, lang: NudgeLang = 'both') => (lang === 'hi' ? l.hi : lang === 'en' ? l.en : `${l.hi}\n${l.en}`);
const sayTitle = (l: L, lang: NudgeLang) => (lang === 'hi' ? l.hi : lang === 'en' ? l.en : `${l.hi} · ${l.en}`);

export const slotOf = (hour: number): Slot | null => {
  if (hour < 6 || hour >= 23) return null;
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
};

const inrShort = (n: number) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(1).replace(/\.0$/, '')} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `₹${Math.round(n)}`);
const short = (s: string | undefined, n = 40) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : (s ?? ''));
const T = (id: string, slot: Slot, title: L, body: L, route = '/'): T => ({ id, slot, title, body, route });

// ---------- Arpan ----------
function arpanPool(c: NudgeCtx, slot: Slot): T[] {
  const one = short(c.oneThing);
  const water: T[] =
    c.waterGlasses < Math.ceil(c.waterTarget * Math.min(1, (c.hour - 5) / 16))
      ? [T('a-water', slot, { en: 'Water 💧', hi: 'पानी 💧' }, { en: `${c.waterGlasses}/${c.waterTarget} glasses. One glass now, then work.`, hi: `${c.waterGlasses}/${c.waterTarget} गिलास। अभी एक गिलास, फिर काम।` })]
      : [];
  const pools: Record<Slot, T[]> = {
    morning: [
      T('a-m1', 'morning', { en: 'First task', hi: 'पहला काम' }, c.oneThing && !c.oneThingDone ? { en: `"${one}": first 25 minutes, phone away.`, hi: `"${one}": पहले 25 मिनट, फ़ोन दूर।` } : { en: 'Write today’s One Thing. One line, now.', hi: 'आज का One Thing लिखो। एक पंक्ति, अभी।' }),
      T('a-m2', 'morning', { en: 'Client / GST', hi: 'क्लाइंट / GST' }, c.firstPending ? { en: `This first: ${short(c.firstPending)}. Rest later.`, hi: `पहले यह: ${short(c.firstPending)}। बाकी बाद में।` } : { en: 'Which client or GST task comes first today? Add it to your to-dos now.', hi: 'आज पहले कौन सा क्लाइंट या GST काम है? अभी टू-डू में जोड़ो।' }, '/planner'),
      T('a-m3', 'morning', { en: 'Execute', hi: 'अमल करो' }, { en: 'Before motivating others, do your own work. Ship first.', hi: 'दूसरों को प्रेरित करने से पहले अपना काम करो। पहले पूरा करो।' }),
    ],
    afternoon: [
      T('a-a1', 'afternoon', { en: 'Timesheet', hi: 'टाइमशीट' }, { en: 'Today’s time log filled? 2 minutes, now.', hi: 'आज का टाइम लॉग भरा? 2 मिनट, अभी।' }, '/work'),
      T('a-a2', 'afternoon', { en: 'Billing', hi: 'बिलिंग' },
        c.billing
          ? { en: `This month ${inrShort(c.billing.total)} of ${inrShort(c.billing.target)}. Need about ${inrShort(c.billing.needPerDay)} a day. ${c.billing.todayEntered ? 'Raise one more invoice.' : 'Enter today’s tentative billing.'}`, hi: `इस महीने ${inrShort(c.billing.total)} / ${inrShort(c.billing.target)}। रोज़ लगभग ${inrShort(c.billing.needPerDay)} चाहिए। ${c.billing.todayEntered ? 'एक और इनवॉइस बनाओ।' : 'आज की संभावित बिलिंग दर्ज करो।'}` }
          : { en: 'How much billed today? Target is ₹10–50k a day. Raise one invoice.', hi: 'आज कितना बिल किया? लक्ष्य रोज़ ₹10–50 हज़ार। एक इनवॉइस बनाओ।' }, '/'),
      T('a-a3', 'afternoon', { en: 'AI leverage', hi: 'AI का लाभ' }, { en: 'Let AI do the first draft. Your time is for review.', hi: 'पहला ड्राफ़्ट AI से बनवाओ। तुम्हारा समय सिर्फ़ समीक्षा के लिए है।' }, '/mentor'),
      T('a-a4', 'afternoon', { en: 'Next 15 minutes', hi: 'अगले 15 मिनट' }, { en: 'Is this the best use of the next 15 minutes? If not, switch now.', hi: 'क्या अगले 15 मिनट का यही सबसे अच्छा उपयोग है? नहीं, तो अभी बदलो।' }),
    ],
    evening: [
      T('a-e1', 'evening', { en: 'Build something', hi: 'कुछ सार्थक बनाओ' }, { en: '20 minutes on a content post or product idea. Build, don’t scroll.', hi: 'कंटेंट पोस्ट या प्रोडक्ट आइडिया पर 20 मिनट। स्क्रॉल नहीं, निर्माण।' }, '/work'),
      T('a-e2', 'evening', { en: 'Networking', hi: 'नेटवर्किंग' },
        c.duePerson
          ? { en: `${short(c.duePerson.name, 20)}${c.duePerson.days !== null ? `: ${c.duePerson.days} days since you spoke` : ': not contacted yet'}. Call or plan a dinner. It builds a strong career.`, hi: `${short(c.duePerson.name, 20)}${c.duePerson.days !== null ? `: बात किए ${c.duePerson.days} दिन हो गए` : ': अभी तक संपर्क नहीं हुआ'}। कॉल करो या डिनर प्लान करो। इससे मज़बूत करियर बनता है।` }
          : { en: 'Call a friend or client, or plan a dinner meet. A strong network builds a strong career.', hi: 'किसी मित्र/क्लाइंट को फ़ोन करो या डिनर प्लान करो। मज़बूत नेटवर्क से मज़बूत करियर बनता है।' }, '/work'),
      T('a-e3', 'evening', { en: 'Chanakya’s lesson', hi: 'चाणक्य की सीख' }, { en: 'Time well spent is the real wealth. Today’s work, today.', hi: 'सही उपयोग हुआ समय ही असली धन है। आज का काम आज।' }),
      T('a-e4', 'evening', { en: 'Comerze / AI', hi: 'Comerze / AI' }, c.openToday > 0 ? { en: `${c.openToday} tasks left. Finish one, then build.`, hi: `${c.openToday} काम बाकी। एक पूरा करो, फिर निर्माण।` } : { en: 'Today’s tasks done. Next small step on Comerze or an AI product.', hi: 'आज के काम पूरे। अब Comerze या AI प्रोडक्ट का अगला छोटा कदम।' }, '/work'),
    ],
    night: [T('a-n1', 'night', { en: 'Detox', hi: 'डिटॉक्स' }, { en: 'Time to switch off screens. Tomorrow beats today if you sleep now.', hi: 'स्क्रीन बंद करने का समय। अभी सोओगे तो कल आज से बेहतर होगा।' })],
  };
  return [...pools[slot], ...water];
}

// ---------- Priya ----------
// Rules: every message names Arpan, asks the two mandatory questions (discussed with Arpan? delegating or working alone?),
// praises first, and teaches "kaam karna nahi, karwana hai". Health lines are honest and gentle: no weight talk, no scare tactics.
const TAIL: L = { en: 'Discussed with Arpan? Delegating today, or working alone?', hi: 'अर्पण से बात हुई? आज काम करवा रही हो या अकेले कर रही हो?' };
const withTail = (l: L): L => ({ en: `${l.en} ${TAIL.en}`, hi: `${l.hi} ${TAIL.hi}` });
const GOAL_LINE: Record<string, { title: L; body: L }> = {
  gym: { title: { en: 'Gym time', hi: 'जिम का समय' }, body: { en: 'Go to the gym today, even for 30 minutes. First step: put your shoes on.', hi: 'आज जिम जाओ, 30 मिनट ही सही। पहला कदम: जूते पहन लो।' } },
  walk: { title: { en: 'Walk', hi: 'सैर' }, body: { en: 'A 20-minute walk now. Fresh air, clear mind.', hi: 'अभी 20 मिनट की सैर। ताज़ी हवा, साफ़ मन।' } },
  breathing: { title: { en: 'Breathe', hi: 'साँस' }, body: { en: 'Five slow deep breaths now. It lowers stress.', hi: 'अभी पाँच धीमी गहरी साँसें। इससे तनाव कम होता है।' } },
  yoga: { title: { en: 'Yoga', hi: 'योग' }, body: { en: '15 minutes of yoga or stretching today.', hi: 'आज 15 मिनट योग या स्ट्रेचिंग।' } },
  eating: { title: { en: 'Healthy plate', hi: 'सेहतमंद थाली' }, body: { en: 'Add one healthy item to your plate today.', hi: 'आज अपनी थाली में एक सेहतमंद चीज़ जोड़ो।' } },
  sleep: { title: { en: 'Sleep', hi: 'नींद' }, body: { en: 'Sleep on time tonight. Rest is part of the work.', hi: 'आज रात समय पर सोओ। आराम भी काम का हिस्सा है।' } },
};
function priyaPool(c: NudgeCtx, slot: Slot): T[] {
  const goals = c.healthGoals ?? [];
  // Gym first: if she chose gym it comes ahead of her other goals. With no goal chosen, ask her to choose.
  const ordered = [...goals].sort((a, b) => (a === 'gym' ? -1 : b === 'gym' ? 1 : 0));
  const healthLine: T[] = ordered.length
    ? ordered.filter((g) => GOAL_LINE[g]).map((g) => T(`p-h-${g}`, slot, GOAL_LINE[g].title, withTail(GOAL_LINE[g].body), '/couple'))
    : [T('p-h-ask', slot, { en: 'Your health goal', hi: 'आपका हेल्थ गोल' }, withTail({ en: 'Tell me your health goal in Settings: gym first, then walking or breathing.', hi: 'सेटिंग्स में अपना हेल्थ गोल बताओ: पहले जिम, फिर सैर या साँस।' }), '/settings')];
  const client: T = T('p-client', slot, { en: 'Clients first', hi: 'पहले क्लाइंट' }, withTail({ en: 'Hand the routine work over and focus on client satisfaction. Call one client for feedback.', hi: 'रोज़ का काम सौंप दो और क्लाइंट की संतुष्टि पर ध्यान दो। एक क्लाइंट से फ़ीडबैक लो।' }), '/couple');
  const p: Record<Slot, T[]> = {
    morning: [
      T('p-m1', 'morning', { en: 'You are doing well 🌸', hi: 'आप बहुत अच्छा कर रही हो 🌸' }, withTail({ en: 'Hand one task to someone today and check it. Be the manager, not the typewriter.', hi: 'आज एक काम किसी को सौंपो और जाँचो। मैनेजर बनो, टाइपराइटर नहीं।' }), '/couple'),
      T('p-m2', 'morning', { en: 'Start of the day', hi: 'दिन की शुरुआत' }, withTail({ en: '10-minute walk or deep breaths now. Your health is your team’s strength.', hi: 'अभी 10 मिनट टहलो या गहरी साँसें लो। आपकी सेहत ही आपकी टीम की ताक़त है।' }), '/couple'),
    ],
    afternoon: [
      T('p-a1', 'afternoon', { en: 'Get it done, don’t do it', hi: 'काम करना नहीं, करवाना है' }, withTail({ en: 'Pick one daily task you do yourself, hand it over, and check it in the evening.', hi: 'रोज़ का एक काम जो खुद करती हो, किसी को दो और शाम को जाँचो।' }), '/couple'),
      T('p-a2', 'afternoon', { en: 'Well done!', hi: 'शाबाश!' }, withTail({ en: 'Running the home and children is big work. Now think bigger: what is your partner-level work?', hi: 'घर और बच्चों को सँभालना बड़ा काम है। अब बड़ा सोचो: आपका पार्टनर-स्तर का काम क्या है?' }), '/couple'),
    ],
    evening: [
      T('p-e1', 'evening', { en: 'Time with the children', hi: 'बच्चों के साथ समय' }, withTail({ en: 'Give the children 20 full minutes today. Phone away, just be with them.', hi: 'आज बच्चों को पूरे 20 मिनट दो। फ़ोन दूर, बस उनके साथ।' }), '/couple'),
      T('p-e2', 'evening', { en: '10 minutes with Arpan', hi: 'अर्पण के साथ 10 मिनट' }, withTail({ en: 'Did you give Arpan time today? Talk 10 minutes about today and tomorrow’s plan.', hi: 'आज अर्पण को समय दिया? आज और कल की योजना पर 10 मिनट बात करो।' }), '/couple'),
      T('p-e3', 'evening', { en: 'If it stays like this?', hi: 'अगर ऐसे ही चलता रहा?' }, withTail({ en: 'You are doing well, but only staying busy will not change tomorrow. Delegate one task.', hi: 'आप अच्छा कर रही हो, पर सिर्फ़ व्यस्त रहने से कल नहीं बदलेगा। एक काम सौंपो।' }), '/couple'),
    ],
    night: [T('p-n1', 'night', { en: 'Today’s account', hi: 'आज का हिसाब' }, withTail({ en: 'Be proud of what you did well today. Tomorrow we delegate one more task.', hi: 'आज जो अच्छा किया उस पर गर्व करो। कल एक और काम सौंपेंगे।' }), '/couple')],
  };
  if (slot === 'morning') p.morning.push(...healthLine.slice(0, 2));
  if (slot === 'afternoon') p.afternoon.push(client);
  if (slot === 'evening') p.evening.push(...healthLine.slice(0, 1));
  return p[slot];
}

// ---------- Sunday: no rest, but a different day ----------
// Each other (talk, assess the week), billing, gyaan (podcast/book), content created with AI and scheduled for the weekdays.
function sundayPool(c: NudgeCtx, slot: Slot): T[] {
  const priya = c.role === 'priya';
  const wrap = (l: L) => (priya ? withTail(l) : l);
  const h = c.hour;
  if (h < 12)
    return [T('s-talk', slot, { en: 'Sunday: time for each other', hi: 'रविवार: एक-दूसरे के लिए समय' }, wrap({ en: 'No rest today. Sit together 30 minutes: talk, and assess the past week honestly.', hi: 'आज आराम नहीं। 30 मिनट साथ बैठो: बात करो और पिछले हफ़्ते का ईमानदार आकलन करो।' }), '/couple')];
  if (h < 15)
    return [T('s-bill', slot, { en: 'Billing sitting', hi: 'बिलिंग की बैठक' }, wrap(priya ? { en: 'Sit with Arpan for billing: which invoices are pending and who follows up?', hi: 'अर्पण के साथ बिलिंग पर बैठो: कौन से इनवॉइस बाकी हैं और फ़ॉलो-अप कौन करेगा?' } : { en: 'Sit for billing: raise every pending invoice, list the follow-ups.', hi: 'बिलिंग पर बैठो: हर बाकी इनवॉइस बनाओ, फ़ॉलो-अप की सूची बनाओ।' }), '/work')];
  if (h < 18)
    return [T('s-content', slot, { en: 'Make the week’s content', hi: 'हफ़्ते का कंटेंट बनाओ' }, wrap({ en: 'Use Claude/AI to draft 3 posts now and schedule them for the weekdays.', hi: 'अभी Claude/AI से 3 पोस्ट बनवाओ और हफ़्ते के दिनों के लिए शेड्यूल करो।' }), '/work')];
  if (h < 22)
    return [T('s-gyaan', slot, { en: 'Gyaan time', hi: 'ज्ञान का समय' }, wrap({ en: 'Watch one podcast or read one chapter together. Write one takeaway each.', hi: 'साथ में एक पॉडकास्ट देखो या एक अध्याय पढ़ो। हर कोई एक सीख लिखे।' }), '/grow')];
  return [];
}

/** Deterministic pick so the same quarter-hour always gives the same line, and consecutive lines differ. */
export function pickNudge(c: NudgeCtx): Nudge | null {
  const slot = slotOf(c.hour);
  if (!slot) return null;
  const lang = c.lang ?? 'both';
  const sunday = c.weekday === 0 ? sundayPool(c, slot) : [];
  const pool = sunday.length ? sunday : c.role === 'priya' ? priyaPool(c, slot) : arpanPool(c, slot);
  if (!pool.length) return null;
  const t = pool[(c.hour * 4 + Math.floor(c.minute / 15)) % pool.length];
  return { id: t.id, role: c.role, slot: t.slot, title: sayTitle(t.title, lang), body: say(t.body, lang), route: t.route };
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
export function lateWakeLine(time: string, lateMin: number, lang: NudgeLang = 'both'): string | null {
  if (lateMin < 30) return null;
  return say({ en: `You woke at ${time} today. If today goes like this, tomorrow will be harder. First task: 10 minutes, now.`, hi: `आज ${time} बजे उठे। अगर आज भी ऐसे ही गया तो कल मुश्किल होगा। पहला काम: 10 मिनट, अभी।` }, lang);
}

// ---------- Night: why wasn't it done ----------
export function eveningAccountability(role: Role, pending: string[], oneThingDone: boolean, lang: NudgeLang = 'both'): { title: string; body: string } {
  if (role === 'priya') {
    const l: L = pending.length
      ? withTail({ en: `${pending.length} tasks pending. Check like a manager; do not do them yourself.`, hi: `${pending.length} काम बाकी हैं। मैनेजर की तरह जाँचो, खुद मत करो।` })
      : withTail({ en: 'Everything is done today, well done! Tell Arpan. Delegate one more task tomorrow.', hi: 'आज सब हो गया, शाबाश! अर्पण को बताओ। कल एक और काम सौंपो।' });
    return { title: sayTitle({ en: 'Today’s account', hi: 'आज का हिसाब' }, lang), body: say(l, lang) };
  }
  if (!pending.length && oneThingDone) return { title: sayTitle({ en: 'Today’s account', hi: 'आज का हिसाब' }, lang), body: say({ en: 'One Thing done. Write tomorrow’s One Thing now.', hi: 'One Thing पूरा हुआ। कल का One Thing अभी लिख दो।' }, lang) };
  return {
    title: sayTitle({ en: 'Why not today?', hi: 'आज क्यों नहीं हुआ?' }, lang),
    body: say({ en: `${pending.length || 'Some'} tasks left: ${short(pending[0], 30)}. Write one line on why. If this continues, ₹10 lakh a month stays far.`, hi: `${pending.length || 'कुछ'} काम बाकी: ${short(pending[0], 30)}। एक पंक्ति में लिखो क्यों। ऐसे चलता रहा तो महीने के ₹10 लाख दूर रहेंगे।` }, lang),
  };
}

/** Time-use check: share of logged minutes that went to advising/motivating others. Returns a flag when the cap is crossed. */
export function timeUseFlag(minutes: { billable: number; building: number; advising: number; other: number }, capPct = 20): { flag: boolean; advisingPct: number } {
  const total = minutes.billable + minutes.building + minutes.advising + minutes.other;
  const advisingPct = total ? Math.round((minutes.advising / total) * 100) : 0;
  return { flag: total >= 60 && advisingPct > capPct, advisingPct };
}

// ---------- Fixed nightly prompts ----------
const minus = (hhmm: string, n: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = Math.max(0, h * 60 + m - n);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
/** Timesheet + invoicing review after 21:00 (Arpan), evening check-in (both), and a detox warning 10 minutes before the cut-off. */
export function fixedNotifications(cfg: Pick<DiscConfig, 'role' | 'eveningCheckin' | 'detoxCutoff'>, lang: NudgeLang = 'both') {
  const out: { time: string; title: string; body: string; route: string; kind: string; days?: number[] }[] = [];
  const mk = (time: string, kind: string, title: L, body: L, route: string, days?: number[]) => out.push({ time, kind, title: sayTitle(title, lang), body: say(body, lang), route, days });
  if (cfg.role === 'arpan')
    mk('21:00', 'timesheet', { en: 'Timesheet & invoicing', hi: 'टाइमशीट और इनवॉइसिंग' }, { en: 'Review today’s timesheet and raise the pending invoice. 5 minutes.', hi: 'आज की टाइमशीट देखो और बाकी इनवॉइस बनाओ। 5 मिनट।' }, '/work', [1, 2, 3, 4, 5, 6]);
  mk(cfg.eveningCheckin, 'evening', { en: 'Evening check-in', hi: 'शाम का चेक-इन' }, cfg.role === 'priya' ? withTail({ en: 'What did you do well today? One line.', hi: 'आज क्या अच्छा किया? एक पंक्ति।' }) : { en: 'Detox-free today? What did you ship? What fixes tomorrow?', hi: 'आज डिटॉक्स रहा? क्या पूरा किया? कल क्या सुधारोगे?' }, '/');
  mk(minus(cfg.detoxCutoff, 10), 'detox', { en: 'Screens off soon', hi: 'स्क्रीन जल्द बंद' }, { en: 'Detox cut-off in 10 minutes. Close the day well.', hi: 'डिटॉक्स में 10 मिनट बचे। दिन को अच्छे से बंद करो।' }, '/');
  return out;
}
