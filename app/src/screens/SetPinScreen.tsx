import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Keypad } from '../components/Keypad';
import { Pill } from '../components/Pill';
import { useApp } from '../store';

export function SetPinScreen() {
  const insets = useSafeAreaInsets();
  const { ui, setPinPress, backToSignin } = useApp();
  const stage = ui.setPinStage;
  const entry = stage === 'first' ? ui.setPinEntry : ui.setPinConfirm;
  const target = 5;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.darkGradTop,
        paddingTop: insets.top + 40,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 22,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.clayLight }}>
        Set up pastoral access
      </Text>
      <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.3, marginTop: 14, color: '#f8f4ec' }}>
        {stage === 'first' ? 'Choose a 5-digit PIN' : 'Confirm your PIN'}
      </Text>
      <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 22, color: 'rgba(248,244,236,.75)' }}>
        Your role can see every request in the church, so a PIN is required each time you sign in. Enter 5 digits, then confirm.
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 30, marginBottom: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: target }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: entry.length > i ? colors.clayLight : 'transparent',
              borderWidth: 1.5,
              borderColor: 'rgba(220,185,143,.6)',
            }}
          />
        ))}
      </View>
      <Text style={{ minHeight: 24, textAlign: 'center', fontSize: 15, color: ui.setPinError ? '#e8a889' : 'rgba(248,244,236,.6)' }}>
        {ui.setPinError || (stage === 'first' ? 'Pick 5 digits you will remember.' : 'Enter the same digits again.')}
      </Text>

      <Keypad onPress={setPinPress} dark />
      <Pill label="Not you? Sign out" onPress={backToSignin} variant="ghost" fg="rgba(248,244,236,.7)" style={{ marginTop: 14 }} />
    </View>
  );
}
