import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Text } from './AppText';
import { colors } from '../theme';
import { Pill } from './Pill';
import { useApp } from '../store';

export function NotificationPromptSheet() {
  const { ui, dismissNotifPrompt, acceptNotifPrompt } = useApp();
  if (!ui.notifPromptOpen) return null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={dismissNotifPrompt}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={dismissNotifPrompt} />
        <View
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: colors.ground,
            padding: 20,
            paddingBottom: 34,
            gap: 14,
          }}
        >
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(38,34,29,.18)', alignSelf: 'center' }} />
          <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.ink }}>Get notified?</Text>
          <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft }}>
            Turn on notifications so you hear about church-wide notices and prayers on your requests right away.
          </Text>
          <Pill label="Turn on notifications" onPress={acceptNotifPrompt} />
          <Pill label="Not now" onPress={dismissNotifPrompt} variant="ghost" />
        </View>
      </View>
    </Modal>
  );
}
