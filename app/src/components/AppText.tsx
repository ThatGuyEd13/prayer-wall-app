import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

// The design spec calls for Barlow throughout at weight 500/600 (with 400
// for unweighted body copy). Custom fonts loaded via expo-font are separate
// named font files per weight, not a single family that responds to the
// `fontWeight` style prop — so every existing style already written as
// `fontWeight: '600'` etc. needs mapping onto the matching loaded font file
// here, in one place, instead of touching every screen.
function familyFor(fontWeight?: string | number): string {
  const w = String(fontWeight ?? '400');
  if (w === '600' || w === 'bold') return 'Barlow_600SemiBold';
  if (w === '500') return 'Barlow_500Medium';
  return 'Barlow_400Regular';
}

export function Text({ style, ...rest }: TextProps) {
  const flat = (StyleSheet.flatten(style) || {}) as Record<string, unknown>;
  const family = familyFor(flat.fontWeight as string | number | undefined);
  return <RNText {...rest} style={[style, { fontFamily: family, fontWeight: 'normal' }]} />;
}
