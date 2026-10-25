// Small chart pieces built from plain Views (fast, no chart library, readable by screen readers via labels).
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tap } from '@/components/ui';
import type { HabitStatus } from '@/lib/store';
import { colors, fonts } from '@/theme/tokens';

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const weekdayLetter = (date: string) => WD[new Date(`${date}T12:00:00+05:30`).getUTCDay()];
export const dayOfMonth = (date: string) => Number(date.slice(8, 10));

/** A day circle: filled = done, half = partial, ✕ = missed, moon = rest, dim = not scheduled, empty ring = unrecorded. */
export function DayCircle({ date, status, color, scheduled = true, isToday, size = 36, onPress, onLongPress, showLabel = true }: {
  date: string;
  status?: HabitStatus | null;
  color: string;
  scheduled?: boolean;
  isToday?: boolean;
  size?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  showLabel?: boolean;
}) {
  const filled = status === 'done';
  const label = `${date}, ${status ? status : scheduled ? 'not recorded' : 'not scheduled'}`;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {showLabel ? <Text style={[styles.dl, isToday && { color: colors.ink, fontFamily: fonts.bodyBold }]}>{weekdayLetter(date)}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={!scheduled && !onLongPress}
        onPress={() => {
          tap();
          onPress?.();
        }}
        onLongPress={onLongPress}
        style={[
          { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: scheduled ? color : colors.hairline, opacity: scheduled ? 1 : 0.4 },
          filled && { backgroundColor: color },
          status === 'partial' && { backgroundColor: color + '55' },
          status === 'missed' && { borderColor: colors.firm, backgroundColor: '#F6E1DA' },
          (status === 'rest' || status === 'na') && { borderStyle: 'dashed', borderColor: colors.muted },
          isToday && !status && { borderWidth: 3 },
        ]}>
        {filled ? <Text style={{ color: '#fff', fontSize: size * 0.5, fontFamily: fonts.bodyBold }}>✓</Text> : null}
        {status === 'partial' ? <Text style={{ color, fontSize: size * 0.42, fontFamily: fonts.bodyBold }}>◐</Text> : null}
        {status === 'missed' ? <Text style={{ color: colors.firm, fontSize: size * 0.4, fontFamily: fonts.bodyBold }}>✕</Text> : null}
        {status === 'rest' ? <Text style={{ color: colors.muted, fontSize: size * 0.4 }}>☾</Text> : null}
        {status === 'na' ? <Text style={{ color: colors.muted, fontSize: size * 0.3 }}>N/A</Text> : null}
      </Pressable>
    </View>
  );
}

/** Calendar-style heat grid. `dates` oldest first, laid out in rows of 7 starting on the weekday of the first date. */
export function HeatGrid({ dates, values, max, color, cell = 18, gap = 4, onPick }: { dates: string[]; values: Record<string, number>; max: number; color: string; cell?: number; gap?: number; onPick?: (d: string) => void }) {
  const first = new Date(`${dates[0]}T12:00:00+05:30`).getUTCDay();
  const pad = Array.from({ length: first }, () => null as string | null);
  const all = [...pad, ...dates];
  const rows: (string | null)[][] = [];
  for (let i = 0; i < all.length; i += 7) rows.push(all.slice(i, i + 7));
  return (
    <View style={{ gap }}>
      <View style={{ flexDirection: 'row', gap }}>
        {WD.map((l, i) => (
          <Text key={i} style={[styles.dl, { width: cell, textAlign: 'center' }]}>
            {l}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {Array.from({ length: 7 }, (_, j) => {
            const d = r[j];
            if (!d) return <View key={j} style={{ width: cell, height: cell }} />;
            const v = values[d] ?? 0;
            const a = max > 0 ? Math.min(1, v / max) : 0;
            return (
              <Pressable
                key={j}
                onPress={() => onPick?.(d)}
                accessibilityLabel={`${d}: ${v} done`}
                style={{ width: cell, height: cell, borderRadius: 5, backgroundColor: v > 0 ? color : colors.surfaceAlt, opacity: v > 0 ? 0.25 + 0.75 * a : 1, alignItems: 'center', justifyContent: 'center' }}>
                {cell >= 24 ? <Text style={{ fontSize: 10, color: v > 0 ? '#fff' : colors.muted, fontFamily: fonts.bodySemi }}>{dayOfMonth(d)}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Vertical bars with labels underneath. */
export function Bars({ items, color, height = 90, suffix = '' }: { items: { label: string; value: number; highlight?: boolean }[]; color: string; height?: number; suffix?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: height + 34 }}>
      {items.map((i, k) => (
        <View key={k} style={{ flex: 1, alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${i.label}: ${i.value}${suffix}`}>
          <Text style={styles.bv}>{i.value > 0 ? `${i.value}${suffix}` : ''}</Text>
          <View style={{ width: '100%', maxWidth: 28, height: Math.max(4, (i.value / max) * height), borderRadius: 8, backgroundColor: i.highlight ? colors.accent : color, opacity: i.value > 0 ? 1 : 0.2 }} />
          <Text style={styles.dl}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Horizontal ranked bars (top habits). */
export function HBar({ label, value, max = 100, color, right }: { label: string; value: number; max?: number; color: string; right?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.hl} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.hr}>{right ?? `${Math.round(value)}%`}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 8, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${Math.max(0, Math.min(1, value / max)) * 100}%`, backgroundColor: color, borderRadius: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dl: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted },
  bv: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.muted },
  hl: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink, flex: 1, paddingRight: 8 },
  hr: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.muted },
});
