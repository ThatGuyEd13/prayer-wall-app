import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { colors, radius } from '../theme';
import { useApp } from '../store';

export function Toast() {
  const { ui } = useApp();
  if (!ui.toast) return null;
  return (
    <View
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 96,
        zIndex: 60,
        borderRadius: radius.row,
        backgroundColor: colors.darkGradTop,
        padding: 14,
      }}
    >
      <Text style={{ color: '#f8f4ec', fontSize: 15, lineHeight: 21 }}>{ui.toast}</Text>
    </View>
  );
}
