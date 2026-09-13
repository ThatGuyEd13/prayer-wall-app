import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, dotFor, initialOf, radius, shadow } from '../theme';
import { DarkCard, SectionLabel } from '../components/Card';
import { Pill } from '../components/Pill';
import { useApp } from '../store';
import { ROLE_LABEL, ROLE_LADDER, Role, User, canManageRoles } from '../types';
import { LockIcon } from '../components/Icons';

const MATRIX = [
  { cap: 'Post a request', m: 1, p: 1, a: 1, w: 1, l: 1 },
  { cap: 'See own requests only', m: 1, p: 0, a: 0, w: 0, l: 0 },
  { cap: 'See every request', m: 0, p: 1, a: 1, w: 1, l: 1 },
  { cap: 'Pray + notify the person', m: 1, p: 1, a: 1, w: 1, l: 1 },
  { cap: 'Church-wide notices', m: 0, p: 0, a: 1, w: 1, l: 1 },
  { cap: 'Change member roles', m: 0, p: 0, a: 0, w: 0, l: 1 },
  { cap: 'Make someone a pastor', m: 0, p: 0, a: 0, w: 0, l: 1 },
  { cap: 'Make someone lead pastor', m: 0, p: 0, a: 0, w: 0, l: 0 },
  { cap: 'Billing & account deletion', m: 0, p: 0, a: 0, w: 0, l: 0 },
];

export function AdminScreen() {
  const { db, currentUser, setRole, set, say } = useApp();
  const me = currentUser!;
  const isOwner = me.role === 'owner';
  const canChangeRoles = canManageRoles(me.role);
  const scrollRef = useRef<ScrollView>(null);
  const [peopleY, setPeopleY] = useState(0);
  const [pickerFor, setPickerFor] = useState<User | null>(null);
  const insets = useSafeAreaInsets();

  const roleOptions = isOwner ? ROLE_LADDER : ROLE_LADDER.filter((r) => r !== 'lead_pastor');

  const roleRank = (role: string) => (role === 'owner' ? ROLE_LADDER.length : ROLE_LADDER.indexOf(role as Role));
  const people = useMemo(
    () =>
      db.users
        .filter((u) => u.role !== 'owner' || isOwner)
        .sort((a, b) => roleRank(b.role) - roleRank(a.role) || a.createdAt - b.createdAt),
    [db.users, isOwner],
  );

  const scrollToPeople = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, peopleY - 20), animated: true });
    say('Use Change next to a name to add or remove a lead pastor.');
  };

  return (
    <>
    <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 20, paddingBottom: 160, gap: 14 }} style={{ flex: 1, backgroundColor: colors.ground }}>
      <DarkCard>
        <Text style={{ fontSize: 11, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', color: colors.clayLight }}>
          {isOwner ? 'Owner' : ROLE_LABEL[me.role]}
        </Text>
        <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: '#f8f4ec' }}>
          {isOwner
            ? 'Full control of the church account'
            : canChangeRoles
            ? 'Everything but the owner keys'
            : 'Everything but changing roles'}
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 22, color: 'rgba(248,244,236,.75)' }}>
          {isOwner
            ? 'You can set every role including lead pastor, and you alone handle billing and deleting the account. The owner section below is visible to you and nobody else.'
            : canChangeRoles
            ? 'You can see every request, run the prayer team, and set roles up to pastor.'
            : 'You can see every request, send church-wide notices, and export the prayer log — but role changes are set by the lead pastor or owner.'}
        </Text>
      </DarkCard>

      <View onLayout={(e) => setPeopleY(e.nativeEvent.layout.y)}>
        <SectionLabel>People</SectionLabel>
      </View>
      {people.map((p) => {
        const locked = !canChangeRoles || p.role === 'owner';
        return (
          <View
            key={p.id}
            style={[
              { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.row, backgroundColor: colors.card, padding: 14 },
              shadow.light,
            ]}
          >
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: dotFor(p.id), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fdfaf4', fontWeight: '600', fontSize: 15 }}>{initialOf(p.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 17, color: colors.ink }}>{p.name}</Text>
              <Text style={{ fontSize: 14, color: colors.inkSoft }}>{ROLE_LABEL[p.role]}</Text>
            </View>
            <Pressable
              disabled={locked}
              onPress={() => setPickerFor(p)}
              style={{
                minHeight: 40,
                paddingHorizontal: 13,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: locked ? 'transparent' : colors.card,
                borderWidth: 1,
                borderColor: locked ? 'rgba(38,34,29,.12)' : 'rgba(140,98,66,.4)',
              }}
            >
              <Text style={{ fontWeight: '600', fontSize: 13, color: locked ? colors.inkSoft : colors.clay }}>{locked ? 'Locked' : 'Change'}</Text>
            </Pressable>
          </View>
        );
      })}

      <SectionLabel>Who can do what</SectionLabel>
      <View style={[{ borderRadius: radius.card, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 6 }, shadow.light]}>
        <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
          <Text style={{ flex: 1, fontSize: 13, color: colors.inkSoft }}>Capability</Text>
          <Text style={{ width: 34, textAlign: 'center', fontWeight: '600', fontSize: 11, color: colors.inkSoft }}>Mem</Text>
          <Text style={{ width: 34, textAlign: 'center', fontWeight: '600', fontSize: 11, color: colors.inkSoft }}>Past</Text>
          <Text style={{ width: 34, textAlign: 'center', fontWeight: '600', fontSize: 11, color: colors.inkSoft }}>Ag</Text>
          <Text style={{ width: 34, textAlign: 'center', fontWeight: '600', fontSize: 11, color: colors.inkSoft }}>Wor</Text>
          <Text style={{ width: 34, textAlign: 'center', fontWeight: '600', fontSize: 11, color: colors.inkSoft }}>Lead</Text>
        </View>
        {MATRIX.map((row) => (
          <View key={row.cap} style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.hairlineSoft }}>
            <Text style={{ flex: 1, fontSize: 14, color: colors.ink }}>{row.cap}</Text>
            {[row.m, row.p, row.a, row.w, row.l].map((v, i) => (
              <Text key={i} style={{ width: 34, textAlign: 'center', fontSize: 15, color: v ? '#6b7a52' : 'rgba(38,34,29,.28)' }}>
                {v ? '✓' : '–'}
              </Text>
            ))}
          </View>
        ))}
        <Text style={{ paddingVertical: 10, fontSize: 14, lineHeight: 20, color: colors.inkSoft }}>
          The owner can do everything in this table plus the owner-only actions below.
        </Text>
      </View>

      <SectionLabel>Church-wide</SectionLabel>
      <AdminRow label="Send a notice to the whole church" onPress={() => set({ adminModal: 'broadcast' })} />
      <AdminRow label="Export the prayer log" onPress={() => set({ adminModal: 'export' })} />

      {isOwner && (
        <>
          <SectionLabel>Owner</SectionLabel>
          <View style={{ borderRadius: radius.card, backgroundColor: colors.clayTint, borderWidth: 1, borderColor: 'rgba(140,98,66,.35)', padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <LockIcon size={17} color={colors.clayDeep} strokeWidth={1.7} />
              <Text style={{ fontSize: 11, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', color: colors.clayDeep }}>
                Only you can see this
              </Text>
            </View>
            <OwnerAction label="Add or remove a lead pastor" hint="Roles" onPress={scrollToPeople} />
            <OwnerAction label="Transfer ownership" hint="Careful" onPress={() => set({ adminModal: 'transfer' })} />
            <OwnerAction label="Billing & subscription" hint="Account" onPress={() => set({ adminModal: 'billing' })} />
            <OwnerAction label="Delete the church account" hint="Permanent" onPress={() => set({ adminModal: 'delete' })} />
          </View>
        </>
      )}
    </ScrollView>

    {pickerFor && (
      <Modal transparent animationType="slide" visible onRequestClose={() => setPickerFor(null)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPickerFor(null)} />
          <View
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: colors.ground,
              padding: 20,
              paddingBottom: insets.bottom + 20,
              gap: 10,
            }}
          >
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(38,34,29,.18)', alignSelf: 'center', marginBottom: 4 }} />
            <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.ink }}>{pickerFor.name}&rsquo;s role</Text>
            <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft, marginBottom: 6 }}>Pick a role to set it right away.</Text>
            {roleOptions.map((r) => {
              const picked = pickerFor.role === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    const person = pickerFor;
                    setPickerFor(null);
                    if (r !== person.role) setRole(person.id, r);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 54,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    backgroundColor: picked ? colors.clayTint : colors.card,
                    borderWidth: 1,
                    borderColor: picked ? colors.clay : 'rgba(38,34,29,.1)',
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>{ROLE_LABEL[r]}</Text>
                  {picked && <Text style={{ color: colors.clay }}>✓</Text>}
                </Pressable>
              );
            })}
            <Pill label="Cancel" onPress={() => setPickerFor(null)} variant="ghost" />
          </View>
        </View>
      </Modal>
    )}
    </>
  );
}

function AdminRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 18, borderRadius: radius.row, backgroundColor: colors.card }, shadow.light]}
    >
      <Text style={{ flex: 1, fontSize: 17, color: colors.ink }}>{label}</Text>
      <Text style={{ color: colors.clay, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

function OwnerAction({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(140,98,66,.25)' }}
    >
      <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>{label}</Text>
      <Text style={{ fontSize: 15, color: colors.clay }}>{hint}</Text>
    </Pressable>
  );
}
