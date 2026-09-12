import React from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from './AppText';
import { colors } from '../theme';
import { Pill } from './Pill';
import { useApp } from '../store';

export function ChangePasswordSheet() {
  const { ui, set, changePassword } = useApp();
  if (!ui.passwordModalOpen) return null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={() => set({ passwordModalOpen: false })}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={() => set({ passwordModalOpen: false })} />
        <ScrollView
          style={{ maxHeight: '84%' }}
          contentContainerStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.ground, padding: 20, paddingBottom: 34, gap: 14 }}
        >
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(38,34,29,.18)', alignSelf: 'center' }} />
          <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.ink }}>Change your password</Text>
          <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft }}>Set a new password here — never share it in a text or chat.</Text>

          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.inkSoft }}>New password</Text>
            <TextInput
              value={ui.newPassword}
              onChangeText={(v) => set({ newPassword: v, passwordError: '' })}
              secureTextEntry
              style={{ minHeight: 52, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(38,34,29,.12)', fontSize: 17, paddingHorizontal: 15, color: colors.ink }}
            />
          </View>
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.inkSoft }}>Confirm new password</Text>
            <TextInput
              value={ui.newPasswordConfirm}
              onChangeText={(v) => set({ newPasswordConfirm: v, passwordError: '' })}
              secureTextEntry
              style={{ minHeight: 52, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(38,34,29,.12)', fontSize: 17, paddingHorizontal: 15, color: colors.ink }}
            />
          </View>

          {!!ui.passwordError && (
            <View style={{ borderRadius: 16, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBorder, padding: 13 }}>
              <Text style={{ fontSize: 15, lineHeight: 21, color: colors.danger }}>{ui.passwordError}</Text>
            </View>
          )}

          <Pill label="Save new password" onPress={changePassword} loading={ui.passwordBusy} disabled={!ui.newPassword || !ui.newPasswordConfirm} />
          <Pill label="Cancel" onPress={() => set({ passwordModalOpen: false, newPassword: '', newPasswordConfirm: '', passwordError: '' })} variant="ghost" />
        </ScrollView>
      </View>
    </Modal>
  );
}
