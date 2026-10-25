// Google Calendar connection + "Sync now". Needs a Google Cloud OAuth client (see docs/GOOGLE_CALENDAR.md);
// without one the card shows the setup steps instead of a button. Planner items sync both ways (see lib/calendar.ts).
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, T } from '@/components/ui';
import { liveRows } from '@/lib/collections';
import { CAL_SCOPE, runSync, type LocalItem } from '@/lib/calendar';
import { dateKey } from '@/lib/metrics';
import { useStore } from '@/lib/store';
import { space } from '@/theme/tokens';

WebBrowser.maybeCompleteAuthSession();
const ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export function CalendarCard() {
  if (!ANDROID && !WEB)
    return (
      <Card tone="sand" style={{ gap: 6 }}>
        <T variant="h2">Google Calendar</T>
        <T variant="caption">Setup baaki hai: Google Cloud OAuth client banana padega. Steps: docs/GOOGLE_CALENDAR.md. Uske baad yahan Connect ka button aa jayega.</T>
      </Card>
    );
  return <Connected />;
}

function Connected() {
  const { state, dispatch } = useStore();
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | undefined>();
  const [request, response, prompt] = Google.useAuthRequest({ androidClientId: ANDROID, webClientId: WEB, scopes: [CAL_SCOPE] });

  const sync = async (tk = token) => {
    if (!tk) return;
    setBusy(true);
    try {
      const today = dateKey();
      const to = new Date(Date.now() + 330 * 60000 + 14 * 86400000).toISOString().slice(0, 10);
      const rows = Object.values(state.collections.planner_items ?? {}) as unknown as LocalItem[];
      const { plan, created } = await runSync(rows, tk, { from: today, to }, fetch as never);
      const at = new Date().toISOString();
      for (const c of created) dispatch({ type: 'col/put', table: 'planner_items', row: { id: c.id, gcalId: c.gcalId, syncedAt: at } });
      for (const l of plan.patchRemote) dispatch({ type: 'col/put', table: 'planner_items', row: { id: l.id, syncedAt: at } });
      for (const u of plan.upsertLocal) dispatch({ type: 'col/put', table: 'planner_items', row: { ...u, syncedAt: at } });
      for (const id of plan.deleteLocal) dispatch({ type: 'col/del', table: 'planner_items', id });
      setMsg(`Sync ho gaya: ${created.length + plan.patchRemote.length} calendar mein, ${plan.upsertLocal.length} planner mein.`);
    } catch (e) {
      setMsg(e instanceof Error && e.message === 'calendar_auth' ? 'Login expire ho gaya. Dobara connect karo.' : 'Sync nahi hua. Internet check karo aur dobara try karo.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (response?.type === 'success') {
      const tk = response.authentication?.accessToken;
      setToken(tk);
      sync(tk);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <Card style={{ gap: space(1) }}>
      <T variant="h2">Google Calendar</T>
      <T variant="caption">Planner ke kaam Google Calendar se dono taraf sync hote hain. Sirf events padhe/likhe jaate hain.</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button compact kind="soft" label={token ? 'Sync now' : 'Connect Google Calendar'} loading={busy} disabled={!request} onPress={() => (token ? sync() : prompt())} />
      </View>
      {msg ? <T variant="caption">{msg}</T> : null}
    </Card>
  );
}
