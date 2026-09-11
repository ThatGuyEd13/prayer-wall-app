import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useApp } from '../store';
import { isAdminRole, isLeaderRole } from '../types';

const TABS: { key: 'wall' | 'pray' | 'mine' | 'notices' | 'admin'; label: string; icon: string }[] = [
  { key: 'wall', label: 'Home', icon: '⌂' },
  { key: 'pray', label: 'Pray', icon: '♡' },
  { key: 'mine', label: 'Mine', icon: '●' },
  { key: 'notices', label: 'Notices', icon: '🔔' },
  { key: 'admin', label: 'Admin', icon: '⚙' },
];

export function TabBar() {
  const { ui, currentUser, goTab } = useApp();
  const insets = useSafeAreaInsets();
  if (!currentUser) return null;
  const leader = isLeaderRole(currentUser.role);
  const admin = isAdminRole(currentUser.role);
  const visible = TABS.filter((t) => (t.key === 'pray' ? leader : t.key === 'admin' ? admin : true));

  return (
    <View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: insets.bottom + 10,
        flexDirection: 'row',
        gap: 3,
        padding: 7,
        borderRadius: 26,
        backgroundColor: 'rgba(253,250,244,.96)',
        borderWidth: 1,
        borderColor: 'rgba(38,34,29,.06)',
      }}
    >
      {visible.map((t) => {
        const active = ui.tab === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => goTab(t.key)}
            style={{
              flex: 1,
              minHeight: 54,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderRadius: 19,
              backgroundColor: active ? 'rgba(140,98,66,.15)' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 16, color: active ? colors.clay : colors.inkSoft }}>{t.icon}</Text>
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: active ? colors.clay : colors.inkSoft }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
