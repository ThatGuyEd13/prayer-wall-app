import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useApp } from '../store';
import { ROLE_LABEL } from '../types';

const TITLES: Record<string, string> = {
  wall: 'Prayer wall',
  pray: 'Pray',
  mine: 'Your requests',
  notices: 'Notices',
  admin: 'Admin',
};

export function Header() {
  const { ui, currentUser, goTab, db } = useApp();
  const insets = useSafeAreaInsets();
  if (!currentUser) return null;
  const unread = db.notifications.filter((n) => n.toUserId === currentUser.id && !n.readAt).length;
  return (
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
      <Image source={require('../../assets/brand/logo.png')} style={{ height: 24, width: 24, resizeMode: 'contain' }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 19, fontWeight: '600', letterSpacing: -0.2, color: colors.ink }}>
          {TITLES[ui.tab] || 'Prayer Wall'}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 13, color: colors.inkSoft }}>
          {currentUser.name} · {ROLE_LABEL[currentUser.role]}
        </Text>
      </View>
      <Pressable
        onPress={() => goTab('notices')}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: 'rgba(38,34,29,.12)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16 }}>🔔</Text>
        {unread > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              paddingHorizontal: 4,
              backgroundColor: colors.clay,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fdfaf4', fontSize: 11, fontWeight: '600' }}>{unread}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
