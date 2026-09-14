import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useApp } from '../store';
import { isAdminRole, isLeaderRole } from '../types';
import { BellIcon, GearIcon, HeartIcon, HomeIcon, PersonIcon } from './Icons';

const TABS: { key: 'wall' | 'pray' | 'mine' | 'notices' | 'admin'; label: string; Icon: typeof HomeIcon }[] = [
  { key: 'wall', label: 'Home', Icon: HomeIcon },
  { key: 'pray', label: 'Pray', Icon: HeartIcon },
  { key: 'mine', label: 'Mine', Icon: PersonIcon },
  { key: 'notices', label: 'Notices', Icon: BellIcon },
  { key: 'admin', label: 'Admin', Icon: GearIcon },
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
        const tint = active ? colors.clay : colors.inkSoft;
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
            <t.Icon size={21} color={tint} strokeWidth={1.6} />
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: tint }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
