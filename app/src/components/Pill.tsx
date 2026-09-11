import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

type Variant = 'solid' | 'outline' | 'ghost' | 'chip';

export function Pill({
  label,
  onPress,
  variant = 'solid',
  disabled,
  bg,
  fg,
  bc,
  style,
  loading,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  bg?: string;
  fg?: string;
  bc?: string;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
}) {
  const base =
    variant === 'solid'
      ? { bg: colors.clay, fg: '#f8f4ec', bc: colors.clay }
      : variant === 'outline'
      ? { bg: 'transparent', fg: colors.ink, bc: colors.hairlineStrong }
      : variant === 'chip'
      ? { bg: colors.card, fg: colors.inkSoft, bc: 'rgba(38,34,29,.12)' }
      : { bg: 'transparent', fg: colors.inkSoft, bc: 'transparent' };
  const resolvedBg = bg ?? base.bg;
  const resolvedFg = fg ?? base.fg;
  const resolvedBc = bc ?? base.bc;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[
        {
          minHeight: 54,
          paddingHorizontal: 20,
          borderRadius: radius.pill,
          backgroundColor: resolvedBg,
          borderWidth: 1,
          borderColor: resolvedBc,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={resolvedFg} /> : <Text style={{ fontSize: 16, fontWeight: '600', color: resolvedFg }}>{label}</Text>}
    </Pressable>
  );
}
