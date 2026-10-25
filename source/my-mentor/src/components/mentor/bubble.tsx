import * as Clipboard from 'expo-clipboard';
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Icon, Pill } from '@/components/kit';
import { ExtractCard, PlanCard, ReviewCard } from '@/components/mentor/cards';
import { Button, tap } from '@/components/ui';
import type { ChatMsg } from '@/lib/store';
import { colors, fonts, radius, shadow, space } from '@/theme/tokens';

/** Static little orb for message avatars (the big animated orb lives in the header). */
export function MiniOrb({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="mo" cx="36%" cy="32%" r="75%">
          <Stop offset="0%" stopColor="#FFF8E6" />
          <Stop offset="50%" stopColor="#BFD9C6" />
          <Stop offset="100%" stopColor="#4F7A63" />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#mo)" />
    </Svg>
  );
}

export function TypingDots() {
  return (
    <View style={styles.row}>
      <MiniOrb />
      <View style={[styles.bubble, styles.model, { flexDirection: 'row', gap: 6, paddingVertical: 16 }]} accessibilityLabel="Krishna is thinking" accessible>
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 160} />
        ))}
      </View>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const o = useSharedValue(0.3);
  useEffect(() => {
    o.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 400, easing: Easing.inOut(Easing.sin) }), withTiming(0.3, { duration: 400 })), -1));
  }, [delay, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.8 + o.value * 0.3 }] }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }, st]} />;
}

const time = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(11, 16);

export function Bubble({ msg, chatId }: { msg: ChatMsg; chatId: string }) {
  const mine = msg.role === 'user';

  if (msg.crisis && !mine) {
    return (
      <View style={styles.row}>
        <MiniOrb />
        <View style={[styles.bubble, styles.crisis]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Icon name="heart" size={18} color={colors.accentText} />
            <Text style={[styles.text, { fontFamily: fonts.bodyBold, color: colors.accentText }]}>I'm here with you</Text>
          </View>
          <Text style={styles.text} selectable>
            {msg.text}
          </Text>
          <View style={{ gap: space(1), marginTop: space(1.5) }}>
            <Button label="Call 112 (emergency)" kind="gold" icon="📞" onPress={() => Linking.openURL('tel:112')} />
            <Button label="Call Tele-MANAS 14416 (free, 24×7)" kind="soft" icon="📞" onPress={() => Linking.openURL('tel:14416')} />
          </View>
        </View>
      </View>
    );
  }

  if (mine) {
    return (
      <Pressable style={[styles.row, { justifyContent: 'flex-end' }]} onLongPress={() => Clipboard.setStringAsync(msg.text)} accessibilityLabel={`You said: ${msg.text}`}>
        <View style={[styles.bubble, styles.mine]}>
          <Text style={[styles.text, { color: '#fff' }]} selectable>
            {msg.text}
          </Text>
          <Text style={[styles.time, { color: 'rgba(255,255,255,0.75)' }]}>{time(msg.at)}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <MiniOrb />
      <Pressable
        style={[styles.bubble, styles.model, msg.card && { maxWidth: '92%' }]}
        onLongPress={() => {
          tap('success');
          Clipboard.setStringAsync(msg.text);
        }}
        accessibilityLabel={`Krishna said: ${msg.text}`}>
        {msg.offline ? <Pill label="Coaching from your records" tone="sand" icon="cloud-offline-outline" /> : null}
        <Text style={[styles.text, msg.offline && { marginTop: 8 }]} selectable>
          {msg.text}
        </Text>
        {msg.card?.kind === 'plan' ? <PlanCard chatId={chatId} msg={msg} /> : null}
        {msg.card?.kind === 'review' ? <ReviewCard chatId={chatId} msg={msg} /> : null}
        {msg.card?.kind === 'extract' ? <ExtractCard chatId={chatId} msg={msg} /> : null}
        <Text style={styles.time}>{time(msg.at)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: space(1.5) },
  bubble: { borderRadius: 20, paddingHorizontal: space(2), paddingVertical: space(1.5), maxWidth: '84%', gap: 2 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 6, marginLeft: 'auto' },
  model: { backgroundColor: colors.surface, borderBottomLeftRadius: 6, ...shadow.card },
  crisis: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space(2), maxWidth: '92%', borderWidth: 1.5, borderColor: colors.accent },
  text: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.ink },
  time: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted, alignSelf: 'flex-end', marginTop: 4 },
});
