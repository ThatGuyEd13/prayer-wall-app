import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../components/AppText';
import { colors, dotFor, initialOf, radius } from '../theme';
import { Card, DarkCard } from '../components/Card';
import { Pill } from '../components/Pill';
import { useApp } from '../store';
import { PROMPTS } from '../types';

export function PrayScreen() {
  const { db, ui, currentUser, startPraySession, nextInSession, skipInSession, endSession, goTab, set } = useApp();
  const me = currentUser!;
  const sess = ui.praySession;

  const open = useMemo(() => db.requests.filter((r) => !r.answeredAt && r.kind === 'request'), [db.requests]);
  const waiting = useMemo(() => open.filter((r) => !r.prayedBy.some((p) => p.userId === me.id)), [open, me.id]);

  if (!sess) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 14 }} style={{ flex: 1, backgroundColor: colors.ground }}>
        <Text style={{ fontSize: 18, lineHeight: 24, color: colors.inkSoft }}>
          A guided walk through the requests, one person at a time. Everyone you pray for gets a note that you did.
        </Text>
        <Card>
          <Text style={{ fontSize: 11, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', color: colors.clay }}>Waiting on prayer</Text>
          <Text style={{ fontSize: 52, fontWeight: '600', letterSpacing: -1, color: colors.ink }}>{waiting.length}</Text>
          <Text style={{ fontSize: 17, lineHeight: 22, color: colors.inkSoft }}>
            {waiting.length ? waiting.map((p) => p.ownerName).join(' · ') : 'The list is covered. Come back tomorrow.'}
          </Text>
          <Pill label="Begin" onPress={startPraySession} style={{ marginTop: 8 }} />
        </Card>
        <View style={{ borderRadius: radius.card, borderWidth: 1, borderColor: 'rgba(140,98,66,.3)', padding: 20, gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', color: colors.clay }}>No pressure</Text>
          <Text style={{ fontSize: 17, lineHeight: 26, color: colors.ink }}>
            You don't have to finish the list, and you don't have to say it well. Read a name, hold it a moment, move on.
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (sess.active) {
    const cur = sess.list[sess.i];
    const pct = sess.list.length ? Math.round((sess.i / sess.list.length) * 100) : 0;
    return (
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 16 }} style={{ flex: 1, backgroundColor: colors.ground }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.hairline, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.clay }} />
          </View>
          <Text style={{ fontSize: 14, color: colors.inkSoft }}>
            {Math.min(sess.i + 1, sess.list.length)} of {sess.list.length}
          </Text>
        </View>
        <View style={{ borderRadius: radius.card, backgroundColor: colors.card, padding: 26, alignItems: 'center', gap: 14 }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: cur ? dotFor(cur.id) : colors.clay, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fdfaf4', fontWeight: '600', fontSize: 22 }}>{cur ? initialOf(cur.ownerName) : ''}</Text>
          </View>
          <Text style={{ fontWeight: '600', fontSize: 19, color: colors.ink }}>{cur?.ownerName}</Text>
          <Text style={{ fontSize: 21, lineHeight: 29, textAlign: 'center', color: colors.ink }}>{cur?.text}</Text>
        </View>
        {cur && (
          <View style={{ borderRadius: radius.card, backgroundColor: colors.clayTint, padding: 20, gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', color: colors.clay }}>Something to pray</Text>
            <Text style={{ fontSize: 18, lineHeight: 24, color: colors.ink }}>{PROMPTS[cur.tag] || PROMPTS.Waiting}</Text>
          </View>
        )}
        <Pill label={sess.i >= sess.list.length - 1 ? 'Prayed — finish' : 'Prayed — next'} onPress={nextInSession} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pill label="Skip for now" onPress={skipInSession} variant="outline" style={{ flex: 1 }} />
          <Pill label="End here" onPress={endSession} variant="ghost" style={{ flex: 1 }} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 14 }} style={{ flex: 1, backgroundColor: colors.ground }}>
      <DarkCard style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', color: colors.clayLight }}>Amen</Text>
        <Text style={{ fontSize: 30, fontWeight: '600', letterSpacing: -0.4, color: '#f8f4ec' }}>
          {sess.done === 0 ? 'Come back when you can' : `You prayed for ${sess.done} ${sess.done === 1 ? 'person' : 'people'}`}
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 22, color: 'rgba(248,244,236,.75)', textAlign: 'center' }}>
          {sess.done > 0 ? 'Each of them just got a note that you did.' : 'Nothing was sent. The list will keep.'}
        </Text>
      </DarkCard>
      <Pill label="Back to requests" onPress={() => { set({ praySession: null }); goTab('wall'); }} />
    </ScrollView>
  );
}
