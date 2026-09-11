import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, dotFor, initialOf, radius, shadow } from '../theme';
import { Card, DarkCard, SectionLabel } from '../components/Card';
import { Pill } from '../components/Pill';
import { useApp } from '../store';
import { ROLE_LABEL, isLeaderRole } from '../types';

export function MineScreen() {
  const { db, set, currentUser, toggleAnswered, signOut } = useApp();
  const me = currentUser!;
  const [remind, setRemind] = useState(true);
  const mineOwn = useMemo(() => db.requests.filter((r) => r.ownerId === me.id && !r.answeredAt), [db.requests, me.id]);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 14 }} style={{ flex: 1, backgroundColor: colors.ground }}>
      {!isLeaderRole(me.role) && (
        <DarkCard>
          <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: colors.clayLight }}>
            Private by default
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: '#f8f4ec' }}>You choose who sees each request.</Text>
          <Text style={{ fontSize: 16, lineHeight: 22, color: 'rgba(248,244,236,.75)' }}>
            Share it with the whole church, or send it to the pastors only. Either way you get a note when someone prays.
          </Text>
        </DarkCard>
      )}

      <Pressable
        onPress={() => set({ composeOpen: true })}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 18, borderRadius: radius.row, backgroundColor: colors.card }, shadow.light]}
      >
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.clay, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fdfaf4', fontSize: 18 }}>+</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 17, color: colors.inkSoft }}>What can we pray with you about?</Text>
      </Pressable>

      <SectionLabel>Your requests</SectionLabel>
      {mineOwn.length === 0 && (
        <View style={{ borderRadius: radius.card, borderWidth: 1, borderColor: 'rgba(38,34,29,.22)', borderStyle: 'dashed', padding: 20 }}>
          <Text style={{ fontSize: 16, lineHeight: 22, color: colors.inkSoft }}>Nothing on the wall right now. Tap the box above whenever you need prayer.</Text>
        </View>
      )}
      {mineOwn.map((r) => {
        const done = !!r.answeredAt;
        return (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ flex: 1, fontSize: 14, color: colors.inkSoft }}>
                {new Date(r.createdAt).toLocaleDateString()} · {r.prayedBy.length} prayed
              </Text>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: radius.pill,
                  backgroundColor: done ? colors.praiseBg : colors.clayTint,
                }}
              >
                <Text style={{ fontWeight: '600', fontSize: 12, color: done ? colors.praise : colors.clayDeep }}>
                  {done ? 'Answered' : r.audience === 'pastors' ? 'With the pastors' : 'On the wall'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 17, lineHeight: 24, color: colors.ink }}>{r.text}</Text>
            <Text style={{ fontSize: 14, color: colors.inkSoft }}>
              {r.audience === 'pastors' ? 'Visible to the pastors only' : 'Shared with the whole church'}
            </Text>
            <Pill
              label={done ? 'Answered — thank God' : 'Mark as answered'}
              onPress={() => toggleAnswered(r.id)}
              bg={done ? colors.praiseSolid : 'transparent'}
              fg={done ? '#f8f4ec' : colors.clay}
              bc={done ? colors.praiseSolid : 'rgba(140,98,66,.4)'}
              style={{ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16 }}
            />
          </Card>
        );
      })}

      <SectionLabel>Your account</SectionLabel>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.card, backgroundColor: colors.card, padding: 18 }, shadow.light]}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: dotFor(me.id), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fdfaf4', fontWeight: '600', fontSize: 17 }}>{initialOf(me.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', fontSize: 18, color: colors.ink }}>{me.name}</Text>
          <Text style={{ fontSize: 14, color: colors.inkSoft }}>{ROLE_LABEL[me.role]}</Text>
        </View>
        <Pill
          label={remind ? 'Notices on' : 'Notices off'}
          onPress={() => setRemind((v) => !v)}
          bg={remind ? colors.clay : 'transparent'}
          fg={remind ? '#f8f4ec' : colors.inkSoft}
          bc={remind ? colors.clay : colors.hairlineStrong}
          style={{ minHeight: 42, paddingHorizontal: 14 }}
        />
      </View>
      <Pill label="Sign out" onPress={signOut} variant="outline" style={{ minHeight: 52 }} />
    </ScrollView>
  );
}
