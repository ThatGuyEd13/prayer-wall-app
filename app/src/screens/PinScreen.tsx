import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Keypad } from '../components/Keypad';
import { Pill } from '../components/Pill';
import { LockIcon } from '../components/Icons';
import { pinLengthFor, useApp } from '../store';

export function PinScreen() {
  const insets = useSafeAreaInsets();
  const { ui, pinPress, backToSignin } = useApp();
  const role = ui.pendingRole;
  const kicker = role === 'owner' ? 'Owner access' : role === 'lead_pastor' ? 'Lead pastor access' : 'Pastoral access';
  const who = role === 'owner' ? 'The owner account' : role === 'lead_pastor' ? 'A lead pastor' : 'A pastor';
  const dotCount = pinLengthFor(ui.pendingName);

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <LockIcon size={17} color={colors.clayLight} strokeWidth={1.7} />
        <Text style={{ fontSize: 11, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', color: colors.clayLight }}>{kicker}</Text>
      </View>
      <Text style={{ fontSize: 28, fontWeight: '600', letterSpacing: -0.3, marginTop: 14, color: '#f8f4ec' }}>Enter your PIN</Text>
      <Text style={{ marginTop: 10, fontSize: 16, lineHeight: 22, color: 'rgba(248,244,236,.75)' }}>
        {who} can see every request in the church, so this second step is required each time.
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 30, marginBottom: 6 }}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: ui.pinEntry.length > i ? (ui.pinBad ? colors.dangerBad : colors.clayLight) : 'transparent',
              borderWidth: 1.5,
              borderColor: ui.pinBad ? colors.dangerBad : 'rgba(220,185,143,.6)',
            }}
          />
        ))}
      </View>
      <Text style={{ minHeight: 24, textAlign: 'center', fontSize: 15, color: ui.pinBad ? '#e8a889' : 'rgba(248,244,236,.6)' }}>
        {ui.pinMessage || 'Enter your PIN'}
      </Text>

      <Keypad onPress={pinPress} dark />
      <Pill label="Not you? Sign out" onPress={backToSignin} variant="ghost" fg="rgba(248,244,236,.7)" style={{ marginTop: 14 }} />
    </View>
  );
}
