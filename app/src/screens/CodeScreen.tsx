import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Keypad } from '../components/Keypad';
import { Pill } from '../components/Pill';
import { useApp } from '../store';

export function CodeScreen() {
  const insets = useSafeAreaInsets();
  const { ui, codePress, backToSignin } = useApp();
  const boxes = [0, 1, 2, 3, 4, 5];

  return (
    <View style={{ flex: 1, backgroundColor: colors.ground, paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.clay }}>
        One-time sign in
      </Text>
      <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.3, marginTop: 14, color: colors.ink }}>Check your phone</Text>
      <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 22, color: colors.inkSoft }}>
        We texted a six-digit code. It works once and expires in ten minutes.
      </Text>

      <View style={{ flexDirection: 'row', gap: 9, justifyContent: 'center', marginTop: 26, marginBottom: 6 }}>
        {boxes.map((i) => (
          <View
            key={i}
            style={{
              width: 44,
              height: 56,
              borderRadius: 14,
              backgroundColor: colors.card,
              borderWidth: 1.5,
              borderColor: ui.codeEntry.length === i ? colors.clay : 'rgba(38,34,29,.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '600', color: colors.ink }}>{ui.codeEntry[i] || ''}</Text>
          </View>
        ))}
      </View>
      <Text style={{ minHeight: 24, textAlign: 'center', fontSize: 15, color: ui.codeBad ? colors.danger : colors.inkSoft }}>
        {ui.codeMessage || 'Enter the code from the demo banner.'}
      </Text>

      <Keypad onPress={codePress} />
      <Pill label="Use my password instead" onPress={backToSignin} variant="ghost" style={{ marginTop: 12 }} />
    </View>
  );
}
