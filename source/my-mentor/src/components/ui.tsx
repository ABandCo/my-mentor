import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts, radius, shadow, space, touch, type } from '@/theme/tokens';

export function tap(kind: 'light' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/* ---------- Text ---------- */
type TProps = { children: ReactNode; variant?: keyof typeof type; style?: StyleProp<TextStyle>; hi?: string };
export function T({ children, variant = 'body', style, hi }: TProps) {
  return (
    <Text style={[type[variant], style]} maxFontSizeMultiplier={1.6}>
      {children}
      {hi ? <Text style={type.hindi}>{`  ${hi}`}</Text> : null}
    </Text>
  );
}

/* ---------- Card ---------- */
export function Card({
  children,
  style,
  tone = 'surface',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'sand' | 'sage' | 'honey';
}) {
  const bg = { surface: colors.surface, sand: colors.surfaceAlt, sage: colors.primarySoft, honey: colors.accentSoft }[tone];
  return <View style={[styles.card, { backgroundColor: bg }, tone === 'surface' && shadow.card, style]}>{children}</View>;
}

/* ---------- Button ---------- */
type BtnProps = {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'soft' | 'ghost' | 'gold' | 'firm';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};
export function Button({ label, onPress, kind = 'primary', icon, disabled, loading, style, compact }: BtnProps) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const palette = {
    primary: { bg: colors.primary, fg: '#FFFFFF' },
    soft: { bg: colors.primarySoft, fg: colors.primaryText },
    ghost: { bg: 'transparent', fg: colors.primaryText },
    gold: { bg: colors.accent, fg: colors.ink },
    firm: { bg: '#F6E1DA', fg: colors.firmText },
  }[kind];
  return (
    <Animated.View style={[aStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        disabled={disabled || loading}
        onPressIn={() => (scale.value = withSpring(0.96, { damping: 15 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 12 }))}
        onPress={() => {
          tap();
          onPress?.();
        }}
        style={[
          styles.btn,
          compact && styles.btnCompact,
          { backgroundColor: palette.bg, opacity: disabled ? 0.45 : 1 },
          kind === 'ghost' && { borderWidth: 1.5, borderColor: colors.hairline },
        ]}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <Text style={[styles.btnText, { color: palette.fg }]}>
            {icon ? `${icon}  ` : ''}
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ---------- Chip ---------- */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Progress ring ---------- */
export function ProgressRing({
  size = 64,
  stroke = 7,
  progress,
  color = colors.primary,
  track = colors.primarySoft,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ---------- Section header ---------- */
export function SectionTitle({ title, hi, action }: { title: string; hi?: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <T variant="title" hi={hi}>
        {title}
      </T>
      {action}
    </View>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ height = 80, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }, style]} />;
}

/* ---------- Empty state ---------- */
export function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body: string; action?: ReactNode }) {
  return (
    <Card tone="sand" style={{ alignItems: 'center', gap: space(1), paddingVertical: space(4) }}>
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
      <T variant="h2" style={{ textAlign: 'center' }}>
        {title}
      </T>
      <T variant="body" style={{ textAlign: 'center', color: colors.muted }}>
        {body}
      </T>
      {action ? <View style={{ marginTop: space(1) }}>{action}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space(2.5) },
  btn: {
    minHeight: touch.min + 4,
    paddingHorizontal: space(3),
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: { minHeight: touch.min, paddingHorizontal: space(2) },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 16 },
  chip: {
    minHeight: 40,
    paddingHorizontal: space(2),
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space(1.5) },
});
