import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del'];

export function Keypad({
  onPress,
  dark,
}: {
  onPress: (k: string) => void;
  dark?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 'auto' }}>
      {KEYS.map((k) => {
        const isAction = k === 'clear' || k === 'del';
        return (
          <Pressable
            key={k}
            onPress={() => onPress(k)}
            style={{
              width: '31%',
              minHeight: 60,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isAction ? 'transparent' : dark ? 'rgba(248,244,236,.1)' : '#fdfaf4',
              borderWidth: 1,
              borderColor: dark ? 'rgba(248,244,236,.16)' : 'rgba(38,34,29,.12)',
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '600', color: dark ? '#f8f4ec' : '#26221d' }}>
              {k === 'clear' ? 'Clear' : k === 'del' ? '⌫' : k}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
