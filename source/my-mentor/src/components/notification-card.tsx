import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';

import { useNotifSchedule } from '@/components/notification-bridge';
import { Button, Card, T } from '@/components/ui';
import { permissionStatus, sendTest } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { colors, space } from '@/theme/tokens';

const timeIST = (d: Date) =>
  d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

export function NotificationCard() {
  const { state, dispatch } = useStore();
  const { sched, refresh } = useNotifSchedule();
  const [perm, setPerm] = useState<string>('…');
  const [testMsg, setTestMsg] = useState<string>();
  const n = state.notif;
  const p = state.profile;
  const paused = n.pausedUntil && new Date(n.pausedUntil).getTime() > Date.now();

  useEffect(() => {
    permissionStatus().then(setPerm);
  }, [sched.at]);

  const pause = (label: string, until: Date) => dispatch({ type: 'setNotif', notif: { pausedUntil: until.toISOString(), pauseLabel: label } });
  const nextWake = () => {
    const [h, m] = p.wake.split(':').map(Number);
    const now = new Date();
    const ist = new Date(now.getTime() + 330 * 60000);
    const day = ist.toISOString().slice(0, 10);
    let at = new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+05:30`);
    if (at.getTime() <= now.getTime()) at = new Date(at.getTime() + 86400000);
    return at;
  };

  if (Platform.OS === 'web') {
    return (
      <Card tone="sand" style={{ gap: space(1) }}>
        <T variant="title">Check-in notifications</T>
        <T variant="body" style={{ color: colors.muted }}>
          Notifications work in the Android app, not in this browser preview.
        </T>
      </Card>
    );
  }

  return (
    <Card style={{ gap: space(1.5) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <T variant="title" hi="सूचनाएँ">
            Check-in notifications
          </T>
          <T variant="caption">
            Hourly {p.intensiveStart}–{p.intensiveEnd} · quiet {p.quietStart}–{p.quietEnd}
          </T>
        </View>
        <Switch
          value={n.enabled}
          onValueChange={(v) => dispatch({ type: 'setNotif', notif: { enabled: v } })}
          accessibilityLabel="Check-in notifications on or off"
          trackColor={{ true: colors.primary, false: colors.hairline }}
          thumbColor="#fff"
        />
      </View>

      {perm !== 'granted' ? (
        <Card tone="honey" style={{ gap: space(1) }}>
          <T variant="title">Notifications are blocked on this phone</T>
          <T variant="body">Allow them, or the hourly check-ins can't reach you.</T>
          {perm === 'undetermined' ? (
            <Button
              label="Allow notifications"
              onPress={async () => {
                await Notifications.requestPermissionsAsync();
                setPerm(await permissionStatus());
                refresh();
              }}
            />
          ) : (
            <Button kind="soft" label="Open phone settings" onPress={() => Linking.openSettings()} />
          )}
        </Card>
      ) : null}

      {n.enabled && perm === 'granted' ? (
        <T variant="body" style={{ color: sched.error ? colors.firmText : colors.primaryText }}>
          {sched.error
            ? `Could not schedule: ${sched.error}`
            : sched.count
              ? `✓ ${sched.count} reminders scheduled for the next 3 days. Next: ${sched.next ? timeIST(sched.next) : '—'}`
              : 'Nothing to schedule right now (outside your window or paused).'}
        </T>
      ) : null}

      {n.enabled ? (
        paused ? (
          <Card tone="sage" style={{ gap: space(1) }}>
            <T variant="body">
              Paused for {n.pauseLabel} until {timeIST(new Date(n.pausedUntil!))}. Your log is kept.
            </T>
            <Button compact kind="primary" label="Resume now" onPress={() => dispatch({ type: 'setNotif', notif: { pausedUntil: undefined, pauseLabel: undefined } })} />
          </Card>
        ) : (
          <View style={{ flexDirection: 'row', gap: space(1) }}>
            <Button compact kind="soft" label="💼 Client work 2h" style={{ flex: 1 }} onPress={() => pause('client work', new Date(Date.now() + 2 * 3600000))} />
            <Button compact kind="soft" label="👨‍👩‍👧 Family time" style={{ flex: 1 }} onPress={() => pause('family time', nextWake())} />
          </View>
        )
      ) : null}

      <Button
        kind="ghost"
        label="Send a test notification"
        onPress={async () => {
          if ((await permissionStatus()) !== 'granted') return setTestMsg('Allow notifications first.');
          await sendTest(5);
          setTestMsg('Sent. It should appear in about 5 seconds, even if you leave the app.');
        }}
      />
      {testMsg ? <T variant="caption">{testMsg}</T> : null}

      <T variant="caption">
        Tip: if check-ins arrive late, open Settings → Apps → My Mentor → Battery and choose "Unrestricted". Android may otherwise delay them a few minutes.
      </T>
    </Card>
  );
}
