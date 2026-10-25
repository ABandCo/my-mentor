// Pure parts of Couple Space (no React, no network) so they can be unit-tested.
export type CoupleKind = 'note' | 'gratitude' | 'goal' | 'goal_agree' | 'habit' | 'habit_agree' | 'checkin' | 'reflection' | 'milestone' | 'ritual';
export type CoupleItem = { id: string; author: string; kind: CoupleKind; data: Record<string, unknown>; createdAt: string; updatedAt: string };

export const mine = (items: CoupleItem[], me?: string) => items.filter((i) => i.author === me);
export const theirs = (items: CoupleItem[], me?: string) => items.filter((i) => i.author !== me);

/** A shared goal/habit is "agreed" only when the OTHER person has posted an agree item for it. */
export function agreements(items: CoupleItem[], kind: 'goal' | 'habit') {
  const agreeKind = kind === 'goal' ? 'goal_agree' : 'habit_agree';
  return items
    .filter((i) => i.kind === kind)
    .map((g) => {
      const agree = items.find((a) => a.kind === agreeKind && a.data.ref === g.id && a.author !== g.author);
      return { item: g, agreedBy: agree?.author ?? null, agreeId: agree?.id ?? null, active: !!agree };
    });
}
