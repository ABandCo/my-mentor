import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { liveRows } from '@/lib/collections';
import { configOf, waterOn } from '@/lib/discipline';
import { nudgeGap, pickNudge } from '@/lib/nudges';
import { dateKey, istHour } from '@/lib/metrics';
import { reschedule } from '@/lib/notifications';
import type { PlanExtras } from '@/lib/notification-plan';
import { HourStatus, useStore } from '@/lib/store';

type Sched = { count: number; next?: Date; error?: string; at?: Date };
const Ctx = createContext<{ sched: Sched; refresh: () => Promise<void> }>({ sched: { count: 0 }, refresh: async () => {} });
export const useNotifSchedule = () => useContext(Ctx);

const HANDLED_KEY = 'mymentor.handledNotif';

/** Facts the reminder planner needs, read from the current data. */
export function extrasFrom(s: ReturnType<typeof useStore>['state']): PlanExtras {
  const today = dateKey();
  const events = liveRows(s.collections, 'planner_items')
    .filter((r) => typeof r.time === 'string' && typeof r.date === 'string' && (r.date as string) >= today && !r.done)
    .map((r) => ({ day: r.date as string, time: r.time as string, title: String(r.title ?? ''), lead: typeof r.remindMin === 'number' ? (r.remindMin as number) : 15 }));
  // Past hours inside the check-in window, newest first: how many in a row were left unanswered?
  let ignored = 0;
  for (let h = istHour() - 1; h >= 6; h--) {
    const v = s.hours[`${today}:${String(h).padStart(2, '0')}`];
    if (!v) continue; // never planned: nothing was asked
    if (v.status) break;
    ignored++;
  }
  const cfg = configOf(s.collections);
  if (!cfg.nudgesOn) return { events, ignoredRecent: ignored };
  const one = s.oneThing[today];
  const open = liveRows(s.collections, 'planner_items').filter((r) => r.date === today && !r.done);
  const onStreak = !!one?.done && ignored === 0;
  return {
    events,
    ignoredRecent: ignored,
    nudges: {
      gapMin: nudgeGap(cfg, ignored, onStreak),
      line: (hour, minute) => {
        const n = pickNudge({
          role: cfg.role, hour, minute, oneThing: one?.text, oneThingDone: one?.done, openToday: open.length,
          firstPending: open[0] ? String(open[0].title ?? '') : undefined, waterGlasses: waterOn(s.collections, today), waterTarget: cfg.waterTarget,
        });
        return n && { title: n.title, body: n.body, route: n.route };
      },
    },
  };
}

export function NotificationBridge({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const [sched, setSched] = useState<Sched>({ count: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;

  const refresh = useCallback(async () => {
    const s = stateRef.current;
    if (!s.hydrated || !s.profile.onboardedAt) return;
    const r = await reschedule(s.profile, s.notif, extrasFrom(s));
    setSched({ ...r, at: new Date() });
  }, []);

  // Reschedule when settings change, and whenever the app comes to the foreground.
  const p = state.profile;
  const n = state.notif;
  const evCount = Object.keys(state.collections.planner_items ?? {}).length;
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated, p.onboardedAt, p.wake, p.sleep, p.intensiveStart, p.intensiveEnd, p.quietStart, p.quietEnd, n.enabled, n.pausedUntil, n.preEvent, n.weeklyReview, n.followUp, n.easeOff, evCount, state.collections.journal_entries?.['cfg:disc']?.updatedAt]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  // Handle taps on notifications and their Done / Partly / Missed buttons (including cold start).
  useEffect(() => {
    if (Platform.OS === 'web' || !state.hydrated) return;
    const handle = async (r: Notifications.NotificationResponse) => {
      const id = `${r.notification.request.identifier}:${r.actionIdentifier}`;
      const seen: string[] = JSON.parse((await AsyncStorage.getItem(HANDLED_KEY)) ?? '[]');
      if (seen.includes(id)) return;
      await AsyncStorage.setItem(HANDLED_KEY, JSON.stringify([...seen, id].slice(-50)));
      const data = r.notification.request.content.data as Record<string, string> | undefined;
      const action = r.actionIdentifier as HourStatus | string;
      if (data?.kind === 'hourly' && data.key && (action === 'done' || action === 'partly' || action === 'missed')) {
        dispatch({ type: 'setHourStatus', key: data.key, status: action });
      }
      router.navigate((data?.kind === 'nudge' && data.route ? data.route : '/') as never);
    };
    Notifications.getLastNotificationResponseAsync().then((r) => r && handle(r));
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [state.hydrated, dispatch]);

  return <Ctx.Provider value={{ sched, refresh }}>{children}</Ctx.Provider>;
}
