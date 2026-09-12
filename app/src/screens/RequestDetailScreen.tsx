import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, dotFor, initialOf, radius, shadow } from '../theme';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { PostMenu } from '../components/PostMenu';
import { useApp } from '../store';

export function RequestDetailScreen() {
  const insets = useSafeAreaInsets();
  const { db, ui, currentUser, closeRequestDetail, prayFor, postComment, set } = useApp();
  const me = currentUser!;

  const request = db.requests.find((r) => r.id === ui.viewingRequestId);
  const comments = useMemo(
    () => db.comments.filter((c) => c.requestId === ui.viewingRequestId),
    [db.comments, ui.viewingRequestId],
  );

  if (!request) return null;
  const prayed = request.prayedBy.some((p) => p.userId === me.id);
  const isPraise = request.kind === 'praise';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.ground }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 13,
          borderBottomWidth: 1,
          borderBottomColor: colors.hairlineSoft,
        }}
      >
        <Pressable
          onPress={closeRequestDetail}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 18, color: colors.ink }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 19, fontWeight: '600', letterSpacing: -0.2, color: colors.ink, flex: 1 }}>
          {isPraise ? 'Praise' : 'Request'}
        </Text>
        <PostMenu request={request} style={{ width: 38, height: 38, borderRadius: 19 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} style={{ flex: 1 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dotFor(request.id), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fdfaf4', fontWeight: '600', fontSize: 16 }}>{initialOf(request.ownerName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 17, letterSpacing: -0.2, color: colors.ink }}>{request.ownerName}</Text>
              <Text style={{ fontSize: 14, color: colors.inkSoft }}>
                {new Date(request.createdAt).toLocaleDateString()} · {request.audience === 'church' ? 'Whole church' : 'Pastors only'}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: radius.pill,
                backgroundColor: isPraise ? colors.praiseBg : colors.clayTint,
              }}
            >
              <Text style={{ fontWeight: '600', fontSize: 12, color: isPraise ? colors.praise : colors.clayDeep }}>{request.tag}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 17, lineHeight: 24, color: colors.ink }}>{request.text}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pill
              label={isPraise ? 'Hallelujah 🙌' : prayed ? 'Prayed — they were told' : 'I prayed'}
              onPress={() => prayFor(request.id)}
              bg={prayed ? colors.clay : 'transparent'}
              fg={prayed ? '#f8f4ec' : isPraise ? colors.clayDeep : colors.clay}
              bc={prayed ? colors.clay : 'rgba(140,98,66,.4)'}
              style={{ minHeight: 46, paddingHorizontal: 18 }}
            />
            <Text style={{ flex: 1, fontSize: 14, color: colors.inkSoft }} numberOfLines={2}>
              {request.prayedBy.length === 0
                ? isPraise
                  ? 'Be the first to celebrate'
                  : 'Be the first to pray'
                : request.prayedBy.map((x) => x.name).join(', ')}
            </Text>
          </View>
        </Card>

        <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.clay, marginTop: 6 }}>
          Comments
        </Text>

        {comments.length === 0 ? (
          <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft }}>No comments yet. Be the first to write one.</Text>
        ) : (
          comments.map((c) => (
            <View
              key={c.id}
              style={[{ borderRadius: radius.row, backgroundColor: colors.card, padding: 14, gap: 4 }, shadow.light]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontWeight: '600', fontSize: 15, color: colors.ink }}>{c.authorName}</Text>
                <Text style={{ fontSize: 13, color: colors.inkSoft }}>{new Date(c.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={{ fontSize: 15, lineHeight: 21, color: colors.ink }}>{c.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 14,
          paddingBottom: insets.bottom + 14,
          borderTopWidth: 1,
          borderTopColor: colors.hairlineSoft,
          backgroundColor: colors.ground,
        }}
      >
        <TextInput
          value={ui.commentDraft}
          onChangeText={(v) => set({ commentDraft: v })}
          placeholder="Write a comment"
          placeholderTextColor="rgba(38,34,29,.4)"
          style={{
            flex: 1,
            minHeight: 46,
            borderRadius: radius.pill,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: 'rgba(38,34,29,.12)',
            fontSize: 15,
            paddingHorizontal: 16,
            color: colors.ink,
          }}
        />
        <Pill
          label="Send"
          onPress={postComment}
          loading={ui.commentBusy}
          disabled={!ui.commentDraft.trim()}
          style={{ minHeight: 46, paddingHorizontal: 20 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
