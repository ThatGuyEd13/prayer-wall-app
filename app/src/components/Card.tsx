import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Text } from './AppText';
import { colors, radius, shadow } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { borderRadius: radius.card, backgroundColor: colors.card, padding: 18, gap: 12 },
        shadow.light,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function DarkCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          borderRadius: radius.card,
          backgroundColor: colors.darkGradTop,
          padding: 20,
          gap: 10,
        },
        shadow.dark,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: colors.clay,
        marginTop: 12,
        marginBottom: -2,
      }}
    >
      {children}
    </Text>
  );
}
