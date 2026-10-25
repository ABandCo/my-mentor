import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'firm' | 'celebrating';

type Palette = { core: string; mid: string; edge: string; halo: string };

const PALETTES: Record<OrbState, Palette> = {
  idle: { core: '#FFF8E6', mid: '#BFD9C6', edge: '#4F7A63', halo: '#DCEBE0' },
  listening: { core: '#FFFDF5', mid: '#CFE3D4', edge: '#5C8C72', halo: '#DCEBE0' },
  thinking: { core: '#FFF4D6', mid: '#E9D49A', edge: '#6E8F5E', halo: '#F6E3B4' },
  speaking: { core: '#FFF8E6', mid: '#C9DFA9', edge: '#4F7A63', halo: '#E4EFD9' },
  firm: { core: '#FFEBD9', mid: '#E2A47E', edge: '#B4613F', halo: '#F3D7C5' },
  celebrating: { core: '#FFFBEA', mid: '#F2D58A', edge: '#D9A441', halo: '#F6E3B4' },
};

// Breath period and depth per state. Firm is deliberately slower and steadier.
const MOTION: Record<OrbState, { period: number; depth: number }> = {
  idle: { period: 2600, depth: 0.04 },
  listening: { period: 700, depth: 0.08 },
  thinking: { period: 1400, depth: 0.03 },
  speaking: { period: 420, depth: 0.06 },
  firm: { period: 3400, depth: 0.02 },
  celebrating: { period: 500, depth: 0.12 },
};

type Props = {
  size?: number;
  state?: OrbState;
  /** 0–1 microphone level; only used while listening. */
  level?: number;
};

export function MentorOrb({ size = 160, state = 'idle', level = 0 }: Props) {
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);
  const spin = useSharedValue(0);
  const p = PALETTES[state];
  const m = MOTION[state];

  useEffect(() => {
    if (reduceMotion) {
      breath.value = 0.5;
      return;
    }
    breath.value = 0;
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: m.period / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: m.period / 2, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    if (state === 'thinking' || state === 'celebrating') {
      spin.value = 0;
      spin.value = withRepeat(withTiming(360, { duration: 3200, easing: Easing.linear }), -1);
    } else {
      cancelAnimation(spin);
      spin.value = withTiming(0, { duration: 400 });
    }
    return () => {
      cancelAnimation(breath);
      cancelAnimation(spin);
    };
  }, [state, reduceMotion, m.period, breath, spin]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * m.depth + (state === 'listening' ? level * 0.12 : 0) }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + breath.value * 0.35,
    transform: [{ scale: 1.05 + breath.value * m.depth * 2.5 }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
    opacity: state === 'thinking' || state === 'celebrating' ? 0.9 : 0.55,
  }));

  const r = size / 2;
  return (
    <View
      style={{ width: size * 1.4, height: size * 1.4, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Mentor, ${state}`}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, haloStyle]}>
        <Svg width={size * 1.4} height={size * 1.4}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="55%" stopColor={p.halo} stopOpacity={0.9} />
              <Stop offset="100%" stopColor={p.halo} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size * 0.7} cy={size * 0.7} r={size * 0.7} fill="url(#halo)" />
        </Svg>
      </Animated.View>

      <Animated.View style={coreStyle}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="core" cx="38%" cy="34%" r="70%">
              <Stop offset="0%" stopColor={p.core} />
              <Stop offset="45%" stopColor={p.mid} />
              <Stop offset="100%" stopColor={p.edge} />
            </RadialGradient>
          </Defs>
          <Circle cx={r} cy={r} r={r} fill="url(#core)" />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
          <Svg width={size} height={size}>
            <Defs>
              <RadialGradient id="glint" cx="30%" cy="28%" r="30%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.9} />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="gold" cx="72%" cy="70%" r="28%">
                <Stop offset="0%" stopColor="#F6E3B4" stopOpacity={0.8} />
                <Stop offset="100%" stopColor="#F6E3B4" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={r} cy={r} r={r} fill="url(#glint)" />
            <Circle cx={r} cy={r} r={r} fill="url(#gold)" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
