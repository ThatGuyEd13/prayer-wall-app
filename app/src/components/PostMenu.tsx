import React, { useState } from 'react';
import { Modal, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Pill } from './Pill';
import { useApp } from '../store';
import { Request } from '../types';

export function PostMenu({ request, style }: { request: Request; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const { currentUser, deleteRequest, toggleAnswered } = useApp();
  const me = currentUser!;
  const [open, setOpen] = useState(false);

  const isOwner = request.ownerId === me.id;
  const canDelete = isOwner || me.role === 'lead_pastor' || me.role === 'owner';
  const canResolve = isOwner && !request.answeredAt;
  if (!canDelete) return null;

  const isPraise = request.kind === 'praise';
  const description = canResolve
    ? 'Resolve moves it to the answered log. Delete removes it for everyone.'
    : 'Delete removes it for everyone.';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={[
          { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
          style,
        ]}
      >
        <Text style={{ fontSize: 16, letterSpacing: 1, color: colors.inkSoft }}>•••</Text>
      </Pressable>

      {open && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
            <View
              style={{
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                backgroundColor: colors.ground,
                padding: 20,
                paddingBottom: insets.bottom + 20,
                gap: 14,
              }}
            >
              <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(38,34,29,.18)', alignSelf: 'center' }} />
              <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.ink }}>
                {request.ownerName}&rsquo;s {isPraise ? 'praise' : 'request'}
              </Text>
              <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft }}>{description}</Text>
              {canResolve && (
                <Pill
                  label="Resolve"
                  onPress={() => {
                    setOpen(false);
                    toggleAnswered(request.id);
                  }}
                  bg={colors.praiseSolid}
                  fg="#fdfaf4"
                  bc={colors.praiseSolid}
                />
              )}
              <Pill
                label="Delete"
                onPress={() => {
                  setOpen(false);
                  deleteRequest(request.id);
                }}
                bg="transparent"
                fg={colors.danger}
                bc={colors.dangerBorder}
              />
              <Pill label="Cancel" onPress={() => setOpen(false)} variant="ghost" />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
