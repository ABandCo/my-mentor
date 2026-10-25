# Design system — "Light, Warm, Alive"

Source of truth in code: `src/theme/tokens.ts`.

## Colour
Cream Linen `#FBF7EF` background · Warm White `#FFFFFF` cards · Soft Sand `#F3ECDD` alt surfaces · Deep Sage `#4F7A63` primary · Mist Sage `#DCEBE0` · Soft Gold `#D9A441` accent · Honey Glow `#F6E3B4` · Ink Green `#1F2D26` text · Stone `#6B7A72` muted · Fern `#3E9B6B` success · Amber `#E39A2D` · Terracotta `#C8553D` firm (never alarm-red) · Sky Mist `#6FA8C7` info.

Contrast: Gold, Sage-on-mist and Terracotta are too light for small text on cream, so text uses darker siblings `primaryText #3F654F`, `accentText #8A6418`, `firmText #A8432E`. Primary buttons are white text on Deep Sage. Gold buttons use Ink text (white on gold fails AA).

## Type
Fraunces (display, numbers) · Plus Jakarta Sans (UI) · Noto Sans Devanagari (Hindi). Body 16 sp. Font scaling allowed up to 1.6×.

## Shape & depth
8-pt grid (`space(n)`), card radius 28, inputs 20, pills fully round. Shadows tinted green-gold, low opacity.

## Motion
Fade-slide entries at 350 ms, spring press feedback, haptic tap on every action (success haptic on completion). Orb respects system "reduce motion".

## Mentor Orb states
idle (slow breath) · listening (fast ripple + voice level) · thinking (swirling glint) · speaking (quick pulse) · firm (terracotta-gold, slow, steady) · celebrating (gold bloom + spin).

## Components (in `src/components/ui.tsx`)
T (text with optional Hindi label) · Card (surface/sand/sage/honey) · Button (primary/soft/ghost/gold/firm, pressed/disabled/loading) · Chip · ProgressRing · SectionTitle · Skeleton · EmptyState · FloatingTabBar.

## Accessibility
48 dp minimum targets, roles and labels on every pressable, colour never the only signal (status pills carry text and symbols).
