import React, { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from './AppText';
import { colors } from '../theme';
import { Pill } from './Pill';
import { useApp } from '../store';
import { saveAndShareCsv } from '../exportCsv';
import { connectGoogleSheets, exportToGoogleSheet } from '../googleSheets';

export function AdminActionSheet() {
  const { ui, set, db, currentUser, sendBroadcast, exportCsv, transferOwnership, deleteChurch } = useApp();
  const modal = ui.adminModal;
  const me = currentUser!;

  const exportCounts = useMemo(() => {
    const total = db.requests.length;
    const prayed = db.requests.filter((r) => r.prayedBy.length > 0).length;
    return { total, prayed };
  }, [db.requests]);

  const transferChoices = useMemo(() => db.users.filter((u) => u.id !== me.id), [db.users, me.id]);

  const [gsBusy, setGsBusy] = useState<'connect' | 'export' | null>(null);
  const [gsMessage, setGsMessage] = useState('');

  const handleConnectGoogle = async () => {
    setGsBusy('connect');
    setGsMessage('');
    const result = await connectGoogleSheets();
    setGsBusy(null);
    setGsMessage(result.ok ? 'Connected. You can now export to Google Sheets.' : result.error || 'Something went wrong.');
  };

  const handleExportGoogle = async () => {
    setGsBusy('export');
    setGsMessage('');
    const result = await exportToGoogleSheet();
    setGsBusy(null);
    if (result.ok && result.url) {
      setGsMessage('Updated — opening it now.');
      Linking.openURL(result.url);
    } else if (result.notConnected) {
      setGsMessage('Connect Google Sheets first (below), then try export again.');
    } else {
      setGsMessage(result.error || 'Export failed.');
    }
  };

  if (!modal) return null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={() => set({ adminModal: null })}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={() => set({ adminModal: null })} />
        <ScrollView
          style={{ maxHeight: '84%' }}
          contentContainerStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.ground, padding: 20, paddingBottom: 34, gap: 14 }}
        >
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(38,34,29,.18)', alignSelf: 'center' }} />

          {modal === 'broadcast' && (
            <>
              <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.ink }}>Notice to the whole church</Text>
              <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft }}>Every member and staff account gets this in Notices.</Text>
              <TextInput
                value={ui.broadcastText}
                onChangeText={(v) => set({ broadcastText: v })}
                placeholder="What should the church know?"
                multiline
                style={{ minHeight: 110, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(38,34,29,.12)', fontSize: 17, lineHeight: 22, padding: 14, textAlignVertical: 'top', color: colors.ink }}
              />
              <Pill label="Send to everyone" onPress={sendBroadcast} disabled={!ui.broadcastText.trim()} />
            </>
          )}

          {modal === 'export' && (
            <>
              <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.ink }}>Export the prayer log</Text>
              <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft }}>
                {exportCounts.total} requests on file, {exportCounts.prayed} prayed for.
              </Text>
              <Pill
                label="Download CSV"
                onPress={async () => {
                  const csv = await exportCsv();
                  await saveAndShareCsv(csv);
                  set({ adminModal: null });
                }}
              />
              <Text style={{ fontSize: 14, color: colors.inkSoft, marginTop: 4 }}>Or keep it live in Google Sheets:</Text>
              <Pill
                label="Update Google Sheet"
                onPress={handleExportGoogle}
                loading={gsBusy === 'export'}
                variant="outline"
              />
              <Pill
                label="Connect Google Sheets"
                onPress={handleConnectGoogle}
                loading={gsBusy === 'connect'}
                variant="ghost"
              />
              {!!gsMessage && <Text style={{ fontSize: 14, color: colors.inkSoft }}>{gsMessage}</Text>}
            </>
          )}

          {modal === 'transfer' && (
            <>
              <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.ink }}>Transfer ownership</Text>
              <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft }}>Pick who takes over. You will drop to lead pastor.</Text>
              <View style={{ gap: 8 }}>
                {transferChoices.map((t) => {
                  const picked = ui.transferPick === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => set({ transferPick: t.id })}
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
                      <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>{t.name}</Text>
                      {picked && <Text style={{ color: colors.clay }}>✓</Text>}
                    </Pressable>
                  );
                })}
              </View>
              <Pill label="Confirm transfer" onPress={() => transferOwnership(ui.transferPick)} disabled={!ui.transferPick} />
            </>
          )}

          {modal === 'billing' && (
            <>
              <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.ink }}>Billing</Text>
              <View style={{ borderRadius: 18, backgroundColor: colors.card, padding: 16, gap: 6 }}>
                <Text style={{ fontSize: 17, color: colors.ink }}>Church plan · $29/month</Text>
                <Text style={{ fontSize: 14, color: colors.inkSoft }}>Payment method not yet connected.</Text>
              </View>
              <Pill label="Update payment method" onPress={() => {}} variant="outline" />
            </>
          )}

          {modal === 'delete' && (
            <>
              <Text style={{ fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.danger }}>Delete the church account</Text>
              <Text style={{ fontSize: 15, lineHeight: 21, color: colors.inkSoft }}>
                This removes every request, notice, and login. Type DELETE to confirm.
              </Text>
              <TextInput
                value={ui.deleteText}
                onChangeText={(v) => set({ deleteText: v })}
                placeholder="DELETE"
                autoCapitalize="characters"
                style={{ minHeight: 52, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(38,34,29,.14)', fontSize: 17, paddingHorizontal: 15, color: colors.ink }}
              />
              <Pill label="Delete permanently" onPress={deleteChurch} disabled={ui.deleteText !== 'DELETE'} bg={colors.danger} bc={colors.danger} />
            </>
          )}

          <Pill label="Cancel" onPress={() => set({ adminModal: null })} variant="ghost" />
        </ScrollView>
      </View>
    </Modal>
  );
}
