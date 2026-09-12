import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../components/AppText';
import { colors, radius, shadow } from '../theme';
import { Pill } from '../components/Pill';
import { CheckIcon } from '../components/Icons';
import { useApp } from '../store';

export function NoticesScreen() {
  const { db, currentUser, markAllRead } = useApp();
  const me = currentUser!;
  const mine = useMemo(
    () => db.notifications.filter((n) => n.toUserId === me.id).sort((a, b) => b.createdAt - a.createdAt),
    [db.notifications, me.id],
  );
  const hasUnread = mine.some((n) => !n.readAt);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 14 }} style={{ flex: 1, backgroundColor: colors.ground }}>
      {mine.length === 0 && (
        <View style={{ borderRadius: radius.card, borderWidth: 1, borderColor: 'rgba(38,34,29,.22)', borderStyle: 'dashed', padding: 22 }}>
          <Text style={{ fontSize: 16, lineHeight: 24, color: colors.inkSoft }}>
            Nothing yet. When a pastor prays for one of your requests, it shows up here.
          </Text>
        </View>
      )}
      {mine.map((n) => (
        <View
          key={n.id}
          style={[
            {
              flexDirection: 'row',
              gap: 14,
              borderRadius: radius.card,
              backgroundColor: n.readAt ? 'rgba(253,250,244,.6)' : colors.card,
              padding: 18,
            },
            shadow.light,
          ]}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: n.readAt ? colors.inkSoft : colors.clay,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckIcon size={19} color="#fdfaf4" strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ fontWeight: '600', fontSize: 18, letterSpacing: -0.2, color: colors.ink }}>{n.title}</Text>
            <Text style={{ fontSize: 16, lineHeight: 22, color: colors.inkSoft }}>{n.body}</Text>
            <Text style={{ fontSize: 14, color: colors.inkSoft }}>{new Date(n.createdAt).toLocaleString()}</Text>
          </View>
          {!n.readAt && <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.clay, marginTop: 6 }} />}
        </View>
      ))}
      {hasUnread && <Pill label="Mark all read" onPress={markAllRead} variant="outline" style={{ minHeight: 50 }} />}
    </ScrollView>
  );
}
