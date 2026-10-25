// Shared UI kit for the advanced screens: icons, segmented tabs, stat tiles, progress bars, bottom sheets.
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Modal, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/components/ui';
import { colors, fonts, radius, shadow, space, touch } from '@/theme/tokens';

export type IconName = keyof typeof Ionicons.glyphMap;

export function Icon({ name, size = 22, color = colors.ink, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={name} size={size} color={color} style={style} accessible={false} />;
}

export function IconButton({
  icon,
  label,
  onPress,
  tone = 'plain',
  size = 22,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  tone?: 'plain' | 'soft' | 'primary' | 'gold';
  size?: number;
  badge?: boolean;
}) {
  const bg = { plain: 'transparent', soft: colors.primarySoft, primary: colors.primary, gold: colors.accentSoft }[tone];
  const fg = { plain: colors.ink, soft: colors.primaryText, primary: '#fff', gold: colors.accentText }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress?.();
      }}
      hitSlop={6}
      style={[styles.iconBtn, { backgroundColor: bg }]}>
      <Icon name={icon} size={size} color={fg} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

/** Rounded segmented control (Today / Week / Month / Year). */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={[styles.segItem, on && styles.segOn]}>
            <Text style={[styles.segText, on && { color: '#fff', fontFamily: fonts.bodyBold }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatTile({ value, label, tone = 'surface', sub }: { value: string; label: string; tone?: 'surface' | 'sage' | 'honey' | 'sand'; sub?: string }) {
  const bg = { surface: colors.surface, sage: colors.primarySoft, honey: colors.accentSoft, sand: colors.surfaceAlt }[tone];
  return (
    <View style={[styles.stat, { backgroundColor: bg }, tone === 'surface' && shadow.card]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue} maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export function ProgressBar({ value, color = colors.primary, track = colors.primarySoft, height = 8 }: { value: number; color?: string; track?: string; height?: number }) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden', flex: 1 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      <View style={{ width: `${p * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Pill({ label, tone = 'sage', icon }: { label: string; tone?: 'sage' | 'gold' | 'firm' | 'sky' | 'sand'; icon?: IconName }) {
  const t = {
    sage: { bg: colors.primarySoft, fg: colors.primaryText },
    gold: { bg: colors.accentSoft, fg: colors.accentText },
    firm: { bg: '#F6E1DA', fg: colors.firmText },
    sky: { bg: '#DCEBF4', fg: '#2F6A8A' },
    sand: { bg: colors.surfaceAlt, fg: colors.muted },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={13} color={t.fg} /> : null}
      <Text style={{ color: t.fg, fontFamily: fonts.bodySemi, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** Bottom sheet. Tap outside or the handle to close. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <Animated.View entering={SlideInDown.duration(260)} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space(2)) + space(1) }]}>
          <View style={styles.handle} />
          {title ? (
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** A row with an icon, a title and an optional subtitle. Used in lists and settings. */
export function Row({ icon, title, sub, right, onPress, tone = 'plain' }: { icon?: IconName; title: string; sub?: string; right?: ReactNode; onPress?: () => void; tone?: 'plain' | 'firm' }) {
  const inner = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.rowIcon, tone === 'firm' && { backgroundColor: '#F6E1DA' }]}>
          <Icon name={icon} size={20} color={tone === 'firm' ? colors.firmText : colors.primaryText} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, tone === 'firm' && { color: colors.firmText }]}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {inner}
    </Pressable>
  );
}

/** Screen header with a big serif title, optional Hindi subtitle and right-side actions. */
export function ScreenHeader({ title, hi, right, left }: { title: string; hi?: string; right?: ReactNode; left?: ReactNode }) {
  return (
    <View style={styles.header}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={styles.h1} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
        {hi ? <Text style={styles.hi}>{hi}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 10, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.surface },
  seg: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4 },
  segItem: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  stat: { flex: 1, borderRadius: radius.md, padding: space(1.75), gap: 2, minHeight: 84, justifyContent: 'center' },
  statValue: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 32, color: colors.ink },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.muted },
  statSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,45,38,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: space(2.5), paddingTop: space(1), maxHeight: '88%', ...shadow.float },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.hairline, marginBottom: space(1.5) },
  sheetTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginBottom: space(1.5) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), minHeight: 56, paddingVertical: space(0.5) },
  rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  rowSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space(1), paddingTop: space(1) },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.ink },
  hi: { fontFamily: fonts.hindi, fontSize: 13, color: colors.muted },
});
