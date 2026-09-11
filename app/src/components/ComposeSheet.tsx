import React from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';
import { Pill } from './Pill';
import { useApp } from '../store';
import { TAGS } from '../types';

export function ComposeSheet() {
  const { ui, set, postRequest } = useApp();
  if (!ui.composeOpen) return null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={() => set({ composeOpen: false })}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={() => set({ composeOpen: false })} />
        <ScrollView
          style={{ maxHeight: '84%' }}
          contentContainerStyle={{ borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.ground, padding: 20, paddingBottom: 34, gap: 14 }}
        >
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(38,34,29,.18)', alignSelf: 'center' }} />
          <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.ink }}>Ask for prayer</Text>
          <TextInput
            value={ui.draftText}
            onChangeText={(v) => set({ draftText: v })}
            placeholder="Say it plain. We'll pray it."
            multiline
            style={{ minHeight: 110, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(38,34,29,.12)', fontSize: 17, lineHeight: 22, padding: 14, textAlignVertical: 'top', color: colors.ink }}
          />
          <Text style={{ fontSize: 14, color: colors.inkSoft }}>Who sees it</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['church', 'pastors'] as const).map((a) => {
              const active = ui.draftAudience === a;
              return (
                <Pressable
                  key={a}
                  onPress={() => set({ draftAudience: a })}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.clay : 'transparent',
                    borderWidth: 1,
                    borderColor: active ? colors.clay : 'rgba(38,34,29,.18)',
                  }}
                >
                  <Text style={{ fontWeight: '600', fontSize: 14, color: active ? '#f8f4ec' : colors.ink }}>
                    {a === 'church' ? 'Whole church' : 'Pastors only'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TAGS.map((t) => {
              const active = ui.draftTag === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => set({ draftTag: t })}
                  style={{
                    minHeight: 42,
                    paddingHorizontal: 14,
                    borderRadius: radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.clay : colors.card,
                    borderWidth: 1,
                    borderColor: active ? colors.clay : 'rgba(38,34,29,.12)',
                  }}
                >
                  <Text style={{ fontWeight: '600', fontSize: 14, color: active ? '#f8f4ec' : colors.inkSoft }}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pill
            label={ui.draftAudience === 'pastors' ? 'Send to the pastors' : 'Post to the wall'}
            onPress={postRequest}
            disabled={!ui.draftText.trim()}
          />
          <Pill label="Not now" onPress={() => set({ composeOpen: false })} variant="ghost" />
        </ScrollView>
      </View>
    </Modal>
  );
}
