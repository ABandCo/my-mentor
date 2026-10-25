import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/tab-bar';
import { useStore } from '@/lib/store';
import { colors } from '@/theme/tokens';

export default function TabLayout() {
  const { state, authReady } = useStore();
  if (!state.hydrated || !authReady) return null;
  // No sign-in wall: the app works fully on this device. Signing in is optional (AI mentor, backup, Couple Space).
  if (!state.profile.onboardedAt) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="habits" />
      <Tabs.Screen name="mentor" />
      <Tabs.Screen name="grow" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
