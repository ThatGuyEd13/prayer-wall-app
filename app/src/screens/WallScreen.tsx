import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, dotFor, initialOf, radius, shadow } from '../theme';
import { Card, DarkCard } from '../components/Card';
import { Pill } from '../components/Pill';
import { useApp } from '../store';
import { isLeaderRole } from '../types';

export function WallScreen() {
  const { db, ui, set, currentUser, prayFor, startPraySession } = useApp();
  const me = currentUser!;
  const leader = isLeaderRole(me.role);

  const open = useMemo(() => db.requests.filter((r) => !r.answeredAt), [db.requests]);
  const requestsOnly = useMemo(() => open.filter((r) => r.kind === 'request'), [open]);
  const waiting = useMemo(() => requestsOnly.filter((r) => !r.prayedBy.some((p) => p.userId === me.id)), [requestsOnly, me.id]);
  const visible = useMemo(
    () => open.filter((r) => leader || r.audience === 'church' || r.ownerId === me.id),
    [open, leader, me.id],
  );
  const visWaiting = useMemo(
    () => visible.filter((r) => r.kind === 'request' && !r.prayedBy.some((p) => p.userId === me.id)),
    [visible, me.id],
  );

  const feed = useMemo(() => {
    return visible.filter((r) => {
      if (ui.wallFilter === 'Praise') return r.kind === 'praise';
      if (ui.wallFilter === 'Waiting') return r.kind === 'request' && !r.prayedBy.some((p) => p.userId === me.id);
      return true;
    });
  }, [visible, ui.wallFilter, me.id]);

  const waitingLine = leader
    ? waiting.length === 0
      ? 'Every request has been prayed over'
      : `${waiting.length} ${waiting.length === 1 ? 'request is' : 'requests are'} waiting`
    : visWaiting.length === 0
    ? 'The wall is covered today'
    : `${visWaiting.length} ${visWaiting.length === 1 ? 'neighbor needs' : 'neighbors need'} prayer`;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 14 }} style={{ flex: 1, backgroundColor: colors.ground }}>
      <DarkCard>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.clayLight }}>
          {leader ? 'Every request, including pastors-only' : 'Shared with the church'}
        </Text>
        <Text style={{ fontSize: 26, fontWeight: '600', letterSpacing: -0.4, color: '#f8f4ec' }}>{waitingLine}</Text>
        <Text style={{ fontSize: 16, lineHeight: 22, color: 'rgba(248,244,236,.72)' }}>
          {leader
            ? 'Members see only what was shared church-wide. When you pray, the person is told.'
            : 'These were shared with everyone. Requests sent to the pastors only never appear here.'}
        </Text>
        {leader && <Pill label="Start praying" onPress={startPraySession} bg="#f8f4ec" fg="#2f2a20" bc="#f8f4ec" style={{ marginTop: 2 }} />}
      </DarkCard>

      <Pressable
        onPress={() => set({ composeOpen: true })}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 18, borderRadius: radius.row, backgroundColor: colors.card }, shadow.light]}
      >
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.clay, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fdfaf4', fontSize: 18 }}>+</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 17, color: colors.inkSoft }}>Add a request of your own</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['All', 'Waiting', 'Praise'] as const).map((f) => {
          const active = ui.wallFilter === f;
          return (
            <Pressable
              key={f}
              onPress={() => set({ wallFilter: f })}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? colors.clay : 'transparent',
                borderWidth: 1,
                borderColor: active ? colors.clay : colors.hairlineStrong,
              }}
            >
              <Text style={{ fontWeight: '600', fontSize: 14, color: active ? '#f8f4ec' : colors.ink }}>{f}</Text>
            </Pressable>
          );
        })}
      </View>

      {feed.length === 0 && (
        <View style={{ borderRadius: radius.card, borderWidth: 1, borderColor: 'rgba(38,34,29,.22)', borderStyle: 'dashed', padding: 20 }}>
          <Text style={{ fontSize: 16, lineHeight: 22, color: colors.inkSoft }}>Nothing here yet.</Text>
        </View>
      )}

      {feed.map((p) => {
        const prayed = p.prayedBy.some((x) => x.userId === me.id);
        return (
          <Card key={p.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: dotFor(p.id), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fdfaf4', fontWeight: '600', fontSize: 16 }}>{initialOf(p.ownerName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 17, letterSpacing: -0.2, color: colors.ink }}>{p.ownerName}</Text>
                <Text style={{ fontSize: 14, color: colors.inkSoft }}>
                  {new Date(p.createdAt).toLocaleDateString()} · {p.audience === 'church' ? 'Whole church' : 'Pastors only'}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: radius.pill,
                  backgroundColor: p.kind === 'praise' ? colors.praiseBg : colors.clayTint,
                }}
              >
                <Text style={{ fontWeight: '600', fontSize: 12, color: p.kind === 'praise' ? colors.praise : colors.clayDeep }}>{p.tag}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 17, lineHeight: 24, color: colors.ink }}>{p.text}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {leader && (
                <Pill
                  label={prayed ? 'Prayed — they were told' : 'I prayed'}
                  onPress={() => prayFor(p.id)}
                  bg={prayed ? colors.clay : 'transparent'}
                  fg={prayed ? '#f8f4ec' : colors.clay}
                  bc={prayed ? colors.clay : 'rgba(140,98,66,.4)'}
                  style={{ minHeight: 46, paddingHorizontal: 18 }}
                />
              )}
              <Text style={{ flex: 1, fontSize: 14, color: colors.inkSoft }}>{p.prayedBy.length} have prayed</Text>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
