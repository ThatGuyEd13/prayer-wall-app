import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { normalizePhone } from './crypto';
import {
  AdminModal,
  Audience,
  AuthStep,
  Comment,
  Kind,
  Notification,
  PrayerLogEntry,
  Request,
  Role,
  ROLE_LABEL,
  User,
  isLeaderRole,
  needsPin,
} from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

function phoneToEmail(phone: string): string {
  return `phone${phone}@phone.prayerwall.local`;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

interface DB {
  users: User[];
  requests: Request[];
  notifications: Notification[];
  comments: Comment[];
}

const emptyDb: DB = { users: [], requests: [], notifications: [], comments: [] };

interface PraySession {
  active: boolean;
  i: number;
  done: number;
  list: Request[];
}

interface UIState {
  loaded: boolean;
  auth: AuthStep;
  sessionUserId: string | null;
  pendingRole: Role | null;

  signinPhone: string;
  signinName: string;
  signinPassword: string;
  signinError: string;
  signinBusy: boolean;
  phoneKnown: boolean;

  codeEntry: string;
  codeMessage: string;
  codeBad: boolean;

  pinEntry: string;
  pinMessage: string;
  pinBad: boolean;
  setPinEntry: string;
  setPinConfirm: string;
  setPinStage: 'first' | 'confirm';
  setPinError: string;

  tab: 'wall' | 'pray' | 'mine' | 'notices' | 'admin';
  wallFilter: 'All' | 'Waiting' | 'Praise';

  composeOpen: boolean;
  draftText: string;
  draftAudience: Audience;
  draftTag: string;
  draftKind: Kind;

  viewingRequestId: string | null;
  commentDraft: string;
  commentBusy: boolean;

  adminModal: AdminModal;
  broadcastText: string;
  transferPick: string;
  deleteText: string;

  passwordModalOpen: boolean;
  newPassword: string;
  newPasswordConfirm: string;
  passwordError: string;
  passwordBusy: boolean;

  toast: string;
  praySession: PraySession | null;
  sessionSec: number;

  notifPromptOpen: boolean;
}

const initialUI: UIState = {
  loaded: false,
  auth: 'signin',
  sessionUserId: null,
  pendingRole: null,
  signinPhone: '',
  signinName: '',
  signinPassword: '',
  signinError: '',
  signinBusy: false,
  phoneKnown: false,
  codeEntry: '',
  codeMessage: '',
  codeBad: false,
  pinEntry: '',
  pinMessage: '',
  pinBad: false,
  setPinEntry: '',
  setPinConfirm: '',
  setPinStage: 'first',
  setPinError: '',
  tab: 'wall',
  wallFilter: 'All',
  composeOpen: false,
  draftText: '',
  draftAudience: 'church',
  draftTag: 'Sickness',
  draftKind: 'request',
  viewingRequestId: null,
  commentDraft: '',
  commentBusy: false,
  adminModal: null,
  broadcastText: '',
  transferPick: '',
  deleteText: '',
  passwordModalOpen: false,
  newPassword: '',
  newPasswordConfirm: '',
  passwordError: '',
  passwordBusy: false,
  toast: '',
  praySession: null,
  sessionSec: 0,
  notifPromptOpen: false,
};

interface AppContextValue {
  db: DB;
  ui: UIState;
  currentUser: User | null;
  set: (patch: Partial<UIState>) => void;
  say: (msg: string) => void;
  goTab: (tab: UIState['tab']) => void;

  onSigninPhone: (v: string) => void;
  onSigninName: (v: string) => void;
  onSigninPassword: (v: string) => void;
  phoneKnown: boolean;
  doSignIn: () => Promise<void>;
  requestCode: () => void;
  codePress: (k: string) => void;
  backToSignin: () => void;
  pinPress: (k: string) => void;
  setPinPress: (k: string) => void;
  signOut: () => void;
  changePassword: () => Promise<void>;

  postRequest: () => Promise<void>;
  openRequestDetail: (id: string) => void;
  closeRequestDetail: () => void;
  postComment: () => Promise<void>;
  toggleAnswered: (id: string) => void;
  deleteRequest: (id: string) => void;
  prayFor: (id: string) => void;
  markAllRead: () => void;
  enableNotifications: () => Promise<boolean>;
  dismissNotifPrompt: () => void;
  acceptNotifPrompt: () => Promise<void>;

  setRole: (userId: string, role: Role) => void;
  sendBroadcast: () => void;
  exportCsv: () => Promise<string>;
  transferOwnership: (userId: string) => void;
  deleteChurch: () => void;

  startPraySession: () => void;
  nextInSession: () => void;
  skipInSession: () => void;
  endSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDb);
  const [ui, setUi] = useState<UIState>(initialUI);
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = useCallback((patch: Partial<UIState>) => setUi((s) => ({ ...s, ...patch })), []);

  const say = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setUi((s) => ({ ...s, toast: msg }));
    toastTimer.current = setTimeout(() => setUi((s) => ({ ...s, toast: '' })), 3200);
  }, []);

  // --- data loading -----------------------------------------------------

  const refreshAll = useCallback(async () => {
    const [profilesRes, requestsRes, prayerLogRes, notificationsRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('id,name,role,created_at'),
      supabase.from('requests').select('*'),
      supabase.from('prayer_log').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('comments').select('*'),
    ]);

    const users: User[] = (profilesRes.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      createdAt: new Date(p.created_at).getTime(),
    }));
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    const prayedByRequest = new Map<string, PrayerLogEntry[]>();
    (prayerLogRes.data || []).forEach((row: any) => {
      const entry: PrayerLogEntry = {
        userId: row.prayed_by,
        name: nameById.get(row.prayed_by) || '',
        at: new Date(row.created_at).getTime(),
      };
      const list = prayedByRequest.get(row.request_id) || [];
      list.push(entry);
      prayedByRequest.set(row.request_id, list);
    });

    const requests: Request[] = (requestsRes.data || []).map((r: any) => ({
      id: r.id,
      ownerId: r.owner_id,
      ownerName: nameById.get(r.owner_id) || '',
      text: r.text,
      tag: r.tag,
      audience: r.audience,
      kind: r.kind,
      createdAt: new Date(r.created_at).getTime(),
      answeredAt: r.answered_at ? new Date(r.answered_at).getTime() : null,
      prayedBy: prayedByRequest.get(r.id) || [],
    }));

    const notifications: Notification[] = (notificationsRes.data || []).map((n: any) => ({
      id: n.id,
      toUserId: n.to_user_id,
      title: n.title,
      body: n.body,
      createdAt: new Date(n.created_at).getTime(),
      readAt: n.read_at ? new Date(n.read_at).getTime() : null,
    }));

    const comments: Comment[] = (commentsRes.data || [])
      .map((c: any) => ({
        id: c.id,
        requestId: c.request_id,
        authorId: c.author_id,
        authorName: nameById.get(c.author_id) || '',
        text: c.text,
        createdAt: new Date(c.created_at).getTime(),
      }))
      .sort((a, b) => a.createdAt - b.createdAt);

    setDb({ users, requests, notifications, comments });
  }, []);

  // --- auth bootstrap + realtime -----------------------------------------

  useEffect(() => {
    let subs: ReturnType<typeof supabase.channel>[] = [];

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.user) {
        const { data: hasPinData } = await supabase.rpc('has_pin');
        const { data: profile } = await supabase.from('profiles').select('id,name,role').eq('id', session.user.id).single();
        const role = profile?.role;
        if (role && needsPin(role)) {
          set({ auth: hasPinData ? 'pin' : 'setpin', sessionUserId: session.user.id, pendingRole: role });
        } else {
          await refreshAll();
          set({ auth: 'authenticated', sessionUserId: session.user.id, tab: 'wall' });
        }
      }
      set({ loaded: true });
    };
    bootstrap();

    const channelNames = ['requests', 'prayer_log', 'notifications', 'profiles', 'comments'] as const;
    subs = channelNames.map((table) =>
      supabase
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          if (uiRef.current.auth === 'authenticated') refreshAll();
        })
        .subscribe(),
    );

    sessionTimer.current = setInterval(() => {
      setUi((s) => (s.praySession && s.praySession.active ? { ...s, sessionSec: s.sessionSec + 1 } : s));
    }, 1000);

    return () => {
      subs.forEach((c) => supabase.removeChannel(c));
      if (sessionTimer.current) clearInterval(sessionTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentUser = useMemo(
    () => db.users.find((u) => u.id === ui.sessionUserId) || null,
    [db.users, ui.sessionUserId],
  );

  // --- push notifications -------------------------------------------------

  type PushResult = 'ok' | 'unsupported' | 'denied' | 'dismissed' | 'error';

  function pushDiagnostics(): string {
    try {
      const hasSW = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
      const hasPM = typeof window !== 'undefined' && 'PushManager' in window;
      const hasNotif = typeof window !== 'undefined' && typeof window.Notification !== 'undefined';
      const standalone = typeof navigator !== 'undefined' && (navigator as any).standalone;
      const dm = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      return `sw=${hasSW} pm=${hasPM} notif=${hasNotif} nav.standalone=${standalone} display-mode=${dm} ua="${ua}"`;
    } catch (e) {
      return `diag-error: ${String(e)}`;
    }
  }

  const logDiag = useCallback((userId: string | undefined, context: string, info: string) => {
    supabase.from('client_diagnostics').insert({ user_id: userId || null, context, info }).then(() => {});
  }, []);

  const subscribeToPush = useCallback(
    async (userId: string): Promise<PushResult> => {
      if (Platform.OS !== 'web') {
        logDiag(userId, 'push_unsupported', `not-web platform=${Platform.OS}`);
        return 'unsupported';
      }
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof window === 'undefined' || !('PushManager' in window)) {
        logDiag(userId, 'push_unsupported', pushDiagnostics());
        return 'unsupported';
      }
      if (typeof window.Notification === 'undefined') {
        logDiag(userId, 'push_unsupported', pushDiagnostics());
        return 'unsupported';
      }
      if (window.Notification.permission === 'denied') return 'denied';
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const perm = await window.Notification.requestPermission();
          if (perm === 'denied') return 'denied';
          if (perm !== 'granted') return 'dismissed';
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
          });
        }
        const json: any = sub.toJSON();
        const { error } = await supabase.from('push_subscriptions').upsert(
          { endpoint: json.endpoint, user_id: userId, p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          { onConflict: 'endpoint' },
        );
        if (error) {
          logDiag(userId, 'push_upsert_error', `${error.message} | ${pushDiagnostics()}`);
          return 'error';
        }
        return 'ok';
      } catch (e) {
        logDiag(userId, 'push_exception', `${String(e)} | ${pushDiagnostics()}`);
        return 'error';
      }
    },
    [logDiag],
  );

  const enableNotifications = useCallback(async () => {
    if (!currentUser) return false;
    const result = await subscribeToPush(currentUser.id);
    const messages: Record<PushResult, string> = {
      ok: 'Notifications turned on for this device.',
      unsupported: 'This browser doesn’t support notifications here.',
      denied: 'Notifications are blocked for this app. On iPhone: Settings → Notifications → find this app → turn on Allow Notifications, then try again.',
      dismissed: 'You dismissed the notification prompt — tap the button again to retry.',
      error: 'Could not finish turning on notifications. Try again in a minute.',
    };
    say(messages[result]);
    return result === 'ok';
  }, [currentUser, subscribeToPush, say]);

  // Once per device: automatically offer to turn on notifications right
  // after sign-in, instead of making people find the button in Mine. Still
  // needs a real tap to satisfy the browser's permission-prompt rules.
  const notifPromptShownRef = useRef(false);

  useEffect(() => {
    if (ui.auth !== 'authenticated' || !currentUser) return;
    if (notifPromptShownRef.current) return;
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof window === 'undefined' || !('PushManager' in window)) return;
    if (typeof window.Notification === 'undefined' || window.Notification.permission !== 'default') return;
    let seen = false;
    try {
      seen = localStorage.getItem('notifPromptSeen') === '1';
    } catch (e) {}
    if (seen) return;
    notifPromptShownRef.current = true;
    set({ notifPromptOpen: true });
  }, [ui.auth, currentUser, set]);

  const dismissNotifPrompt = useCallback(() => {
    try {
      localStorage.setItem('notifPromptSeen', '1');
    } catch (e) {}
    set({ notifPromptOpen: false });
  }, [set]);

  const acceptNotifPrompt = useCallback(async () => {
    try {
      localStorage.setItem('notifPromptSeen', '1');
    } catch (e) {}
    set({ notifPromptOpen: false });
    await enableNotifications();
  }, [set, enableNotifications]);

  const goTab = useCallback((tab: UIState['tab']) => set({ tab }), [set]);

  // --- sign in / sign up --------------------------------------------------

  const onSigninPhone = useCallback(
    (v: string) => {
      set({ signinPhone: v, signinError: '' });
      if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
      phoneCheckTimer.current = setTimeout(async () => {
        const digits = normalizePhone(v);
        if (digits.length < 10) {
          set({ phoneKnown: false });
          return;
        }
        const { data } = await supabase.rpc('phone_taken', { p_phone: digits });
        set({ phoneKnown: !!data });
      }, 350);
    },
    [set],
  );
  const onSigninName = useCallback((v: string) => set({ signinName: v, signinError: '' }), [set]);
  const onSigninPassword = useCallback((v: string) => set({ signinPassword: v, signinError: '' }), [set]);

  // The profile row is created by a database trigger right after sign-up,
  // which can lag a beat behind the signUp() call returning. Retry briefly
  // rather than racing it.
  const fetchOwnRoleWithRetry = useCallback(async (userId: string): Promise<Role | null> => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (profile?.role) return profile.role;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  }, []);

  const proceedPastCredentials = useCallback(
    async (userId: string) => {
      const role = await fetchOwnRoleWithRetry(userId);
      if (role && needsPin(role)) {
        const { data: hasPinData } = await supabase.rpc('has_pin');
        set({
          auth: hasPinData ? 'pin' : 'setpin',
          sessionUserId: userId,
          pendingRole: role,
          pinEntry: '',
          pinMessage: '',
          pinBad: false,
          setPinEntry: '',
          setPinConfirm: '',
          setPinStage: 'first',
          setPinError: '',
        });
      } else {
        await refreshAll();
        set({ auth: 'authenticated', sessionUserId: userId, tab: 'wall' });
      }
    },
    [set, refreshAll, fetchOwnRoleWithRetry],
  );

  const doSignIn = useCallback(async () => {
    const phone = normalizePhone(ui.signinPhone);
    if (phone.length < 10) {
      set({ signinError: 'Enter a 10-digit phone number.' });
      return;
    }
    set({ signinBusy: true });
    const email = phoneToEmail(phone);

    if (ui.phoneKnown) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: ui.signinPassword });
      set({ signinBusy: false });
      if (error || !data.user) {
        set({ signinError: 'That password doesn’t match this number. Try again.' });
        return;
      }
      set({ signinPassword: '', signinError: '' });
      await proceedPastCredentials(data.user.id);
      return;
    }

    const name = ui.signinName.trim();
    if (!name) {
      set({ signinBusy: false, signinError: 'Enter your name to set up this account.' });
      return;
    }
    if (!ui.signinPassword || ui.signinPassword.length < 6) {
      set({ signinBusy: false, signinError: 'Choose a password with at least 6 characters.' });
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password: ui.signinPassword,
      options: { data: { name, phone } },
    });
    set({ signinBusy: false });
    if (error || !data.user) {
      set({ signinError: error?.message || 'Could not create that account.' });
      return;
    }
    set({ signinPassword: '', signinError: '' });
    await proceedPastCredentials(data.user.id);
  }, [ui.signinPhone, ui.signinPassword, ui.signinName, ui.phoneKnown, set, proceedPastCredentials]);

  const requestCode = useCallback(async () => {
    const digits = normalizePhone(ui.signinPhone);
    if (digits.length < 10) {
      set({ signinError: 'Enter a number to text a code to.' });
      return;
    }
    set({ signinBusy: true });
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-sms-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ phone: digits }),
    });
    const json = await res.json();
    set({ signinBusy: false });
    if (!res.ok) {
      set({ signinError: json.error || 'Could not text a code to that number.' });
      return;
    }
    set({ auth: 'code', codeEntry: '', codeMessage: '', codeBad: false, signinError: '' });
    say('Code sent — check your phone.');
  }, [ui.signinPhone, set, say]);

  const codePress = useCallback(
    (k: string) => {
      if (k === 'clear') {
        set({ codeEntry: '', codeMessage: '', codeBad: false });
        return;
      }
      if (k === 'del') {
        setUi((s) => ({ ...s, codeEntry: s.codeEntry.slice(0, -1), codeMessage: '', codeBad: false }));
        return;
      }
      setUi((s) => {
        if (s.codeEntry.length >= 6) return s;
        const next = s.codeEntry + k;
        return { ...s, codeEntry: next, codeMessage: next.length === 6 ? 'Checking…' : '', codeBad: false };
      });
      (async () => {
        const next = uiRef.current.codeEntry + k;
        if (next.length < 6) return;
        const digits = normalizePhone(uiRef.current.signinPhone);
        const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-sms-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ phone: digits, code: next }),
        });
        const json = await res.json();
        if (!res.ok) {
          set({ codeMessage: json.error || 'That code isn’t right.', codeBad: true });
          setTimeout(() => set({ codeEntry: '', codeMessage: '' }), 700);
          return;
        }
        const { data, error } = await supabase.auth.verifyOtp({ email: json.email, token: json.emailOtp, type: 'email' });
        if (error || !data.user) {
          set({ codeMessage: 'Could not sign you in. Try again.', codeBad: true });
          setTimeout(() => set({ codeEntry: '', codeMessage: '' }), 700);
          return;
        }
        set({ codeMessage: 'Code accepted', codeBad: false });
        setTimeout(() => {
          set({ codeEntry: '', codeMessage: '' });
          proceedPastCredentials(data.user!.id);
        }, 460);
      })();
    },
    [set, proceedPastCredentials],
  );

  const backToSignin = useCallback(async () => {
    await supabase.auth.signOut();
    set({
      auth: 'signin',
      pinEntry: '',
      pinMessage: '',
      pinBad: false,
      codeEntry: '',
      codeMessage: '',
      sessionUserId: null,
      signinPassword: '',
    });
  }, [set]);

  const pinPress = useCallback(
    (k: string) => {
      if (k === 'clear') {
        set({ pinEntry: '', pinMessage: '', pinBad: false });
        return;
      }
      if (k === 'del') {
        setUi((s) => ({ ...s, pinEntry: s.pinEntry.slice(0, -1), pinMessage: '', pinBad: false }));
        return;
      }
      setUi((s) => {
        if (s.pinEntry.length >= 5) return s;
        const next = s.pinEntry + k;
        return { ...s, pinEntry: next, pinMessage: '', pinBad: false };
      });
      (async () => {
        const cur = uiRef.current.pinEntry + k;
        if (cur.length < 5) return;
        const { data: ok } = await supabase.rpc('verify_pin', { pin: cur });
        if (ok) {
          set({ pinEntry: cur, pinMessage: 'Unlocked', pinBad: false });
          setTimeout(async () => {
            await refreshAll();
            set({ auth: 'authenticated', tab: 'wall', pinEntry: '', pinMessage: '' });
          }, 420);
        } else {
          set({ pinEntry: cur, pinMessage: 'That PIN is not right. Try again.', pinBad: true });
          setTimeout(() => set({ pinEntry: '' }), 500);
        }
      })();
    },
    [set, refreshAll],
  );

  const setPinPress = useCallback(
    (k: string) => {
      if (k === 'clear') {
        set({ setPinEntry: '', setPinConfirm: '', setPinStage: 'first', setPinError: '' });
        return;
      }
      if (k === 'del') {
        setUi((s) => {
          if (s.setPinStage === 'first') return { ...s, setPinEntry: s.setPinEntry.slice(0, -1), setPinError: '' };
          return { ...s, setPinConfirm: s.setPinConfirm.slice(0, -1), setPinError: '' };
        });
        return;
      }
      setUi((s) => {
        if (s.setPinStage === 'first') {
          if (s.setPinEntry.length >= 5) return s;
          const next = s.setPinEntry + k;
          return next.length === 5 ? { ...s, setPinEntry: next, setPinStage: 'confirm', setPinError: '' } : { ...s, setPinEntry: next };
        }
        if (s.setPinConfirm.length >= s.setPinEntry.length) return s;
        const nextConfirm = s.setPinConfirm + k;
        if (nextConfirm.length === s.setPinEntry.length) {
          if (nextConfirm === s.setPinEntry) {
            (async () => {
              const { error } = await supabase.rpc('set_my_pin', { pin: nextConfirm });
              if (error) {
                set({ setPinEntry: '', setPinConfirm: '', setPinStage: 'first', setPinError: 'Could not save that PIN — try again.' });
                return;
              }
              await refreshAll();
              set({ auth: 'authenticated', tab: 'wall', setPinEntry: '', setPinConfirm: '', setPinStage: 'first' });
            })();
            return { ...s, setPinConfirm: nextConfirm, setPinError: '' };
          }
          setTimeout(() => set({ setPinEntry: '', setPinConfirm: '', setPinStage: 'first' }), 500);
          return { ...s, setPinConfirm: nextConfirm, setPinError: 'Those didn’t match. Start over.' };
        }
        return { ...s, setPinConfirm: nextConfirm, setPinError: '' };
      });
    },
    [set, refreshAll],
  );

  const signOut = useCallback(() => {
    supabase.auth.signOut();
    setDb(emptyDb);
    set({ ...initialUI, loaded: true });
  }, [set]);

  const changePassword = useCallback(async () => {
    const next = uiRef.current.newPassword;
    const confirm = uiRef.current.newPasswordConfirm;
    if (next.length < 6) {
      set({ passwordError: 'Choose a password with at least 6 characters.' });
      return;
    }
    if (next !== confirm) {
      set({ passwordError: 'Those don’t match.' });
      return;
    }
    set({ passwordBusy: true, passwordError: '' });
    const { error } = await supabase.auth.updateUser({ password: next });
    set({ passwordBusy: false });
    if (error) {
      set({ passwordError: 'Could not update your password — try again.' });
      return;
    }
    set({ passwordModalOpen: false, newPassword: '', newPasswordConfirm: '', passwordError: '' });
    say('Password updated.');
  }, [set, say]);

  const me = currentUser;

  // --- app actions ---------------------------------------------------------

  const postRequest = useCallback(async () => {
    if (!me) return;
    const text = ui.draftText.trim();
    if (!text) return;
    const tag = ui.draftKind === 'praise' ? 'Thanks' : ui.draftTag;
    const { data: inserted, error } = await supabase
      .from('requests')
      .insert({
        owner_id: me.id,
        text,
        tag,
        audience: ui.draftAudience,
        kind: ui.draftKind,
      })
      .select('id')
      .single();
    if (error) {
      say('Could not post that — try again.');
      return;
    }
    set({ composeOpen: false, draftText: '', tab: 'mine' });
    await refreshAll();
    if (ui.draftKind === 'praise') {
      say('Posted your praise.');
    } else {
      say(ui.draftAudience === 'pastors' ? 'Sent. Only the pastors can see it.' : 'Posted. The whole church can see it.');
    }

    if (inserted?.id) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const uid = sessionData.session?.user?.id;
      if (token) {
        fetch(`${SUPABASE_URL}/functions/v1/new-post-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
          body: JSON.stringify({ request_id: inserted.id }),
        })
          .then(async (res) => {
            const bodyText = await res.text();
            if (!res.ok) logDiag(uid, 'new_post_push_http_error', `status=${res.status} body=${bodyText}`);
          })
          .catch((e) => logDiag(uid, 'new_post_push_exception', String(e)));
      }
    }
  }, [me, ui.draftText, ui.draftTag, ui.draftAudience, ui.draftKind, set, say, refreshAll, logDiag]);

  const openRequestDetail = useCallback((id: string) => set({ viewingRequestId: id, commentDraft: '' }), [set]);
  const closeRequestDetail = useCallback(() => set({ viewingRequestId: null, commentDraft: '' }), [set]);

  const postComment = useCallback(async () => {
    if (!me || !ui.viewingRequestId) return;
    const text = ui.commentDraft.trim();
    if (!text) return;
    set({ commentBusy: true });
    const { error } = await supabase.from('comments').insert({
      request_id: ui.viewingRequestId,
      author_id: me.id,
      text,
    });
    set({ commentBusy: false });
    if (error) {
      say('Could not post that comment — try again.');
      return;
    }
    set({ commentDraft: '' });
    await refreshAll();
  }, [me, ui.viewingRequestId, ui.commentDraft, set, say, refreshAll]);

  const toggleAnswered = useCallback(
    async (id: string) => {
      const req = db.requests.find((r) => r.id === id);
      if (!req) return;
      await supabase
        .from('requests')
        .update({ answered_at: req.answeredAt ? null : new Date().toISOString() })
        .eq('id', id);
      await refreshAll();
    },
    [db.requests, refreshAll],
  );

  const deleteRequest = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('requests').delete().eq('id', id);
      if (error) {
        say('Could not delete that — try again.');
        return;
      }
      if (ui.viewingRequestId === id) set({ viewingRequestId: null, commentDraft: '' });
      await refreshAll();
    },
    [ui.viewingRequestId, set, say, refreshAll],
  );

  const prayFor = useCallback(
    async (id: string) => {
      if (!me) return;
      const req = db.requests.find((r) => r.id === id);
      const { error } = await supabase.rpc('pray_for', { p_request_id: id });
      if (error) {
        say('Could not record that — try again.');
        return;
      }
      await refreshAll();
      if (req) say(`${req.ownerName} gets a note: "${me.name} prayed for you."`);
    },
    [me, db.requests, say, refreshAll],
  );

  const markAllRead = useCallback(async () => {
    if (!me) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('to_user_id', me.id).is('read_at', null);
    await refreshAll();
  }, [me, refreshAll]);

  const setRole = useCallback(
    async (userId: string, role: Role) => {
      const target = db.users.find((u) => u.id === userId);
      if (!target) return;
      const { error } = await supabase.rpc('set_role', { target_id: userId, new_role: role });
      if (error) {
        say(error.message);
        return;
      }
      await refreshAll();
      say(`${target.name} is now ${ROLE_LABEL[role]}.`);
    },
    [db.users, say, refreshAll],
  );

  const sendBroadcast = useCallback(async () => {
    const text = ui.broadcastText.trim();
    if (!text) return;
    const { error } = await supabase.rpc('send_broadcast', { body: text });
    if (error) {
      say(error.message);
      return;
    }
    set({ adminModal: null, broadcastText: '' });
    await refreshAll();
    say('Sent to everyone.');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const uid = sessionData.session?.user?.id;
    if (token) {
      fetch(`${SUPABASE_URL}/functions/v1/broadcast-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: text }),
      })
        .then(async (res) => {
          const bodyText = await res.text();
          if (!res.ok) {
            logDiag(uid, 'broadcast_push_http_error', `status=${res.status} body=${bodyText}`);
          } else {
            logDiag(uid, 'broadcast_push_ok', bodyText);
          }
        })
        .catch((e) => logDiag(uid, 'broadcast_push_exception', String(e)));
    } else {
      logDiag(uid, 'broadcast_push_no_token', 'no access token at broadcast time');
    }
  }, [ui.broadcastText, set, say, refreshAll, logDiag]);

  const exportCsv = useCallback(async (): Promise<string> => {
    const { data } = await supabase.rpc('export_prayer_log');
    const rows = [['name', 'timestamp', 'tag', 'audience', 'kind', 'prayed', 'text']];
    (data || []).forEach((r: any) => {
      rows.push([
        r.owner_name,
        r.created_at,
        r.tag,
        r.audience === 'church' ? 'Whole church' : 'Pastors only',
        r.kind,
        r.prayed ? 'yes' : 'no',
        String(r.request_text).replace(/"/g, '""'),
      ]);
    });
    return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  }, []);

  const transferOwnership = useCallback(
    async (userId: string) => {
      const target = db.users.find((u) => u.id === userId);
      if (!target) return;
      const { error } = await supabase.rpc('transfer_ownership', { target_id: userId });
      if (error) {
        say(error.message);
        return;
      }
      set({ adminModal: null, transferPick: '' });
      await refreshAll();
      say(`${target.name} is now the owner. You are lead pastor.`);
    },
    [db.users, set, say, refreshAll],
  );

  const deleteChurch = useCallback(async () => {
    const { error } = await supabase.rpc('delete_church_account');
    if (error) {
      say(error.message);
      return;
    }
    signOut();
  }, [say, signOut]);

  const startPraySession = useCallback(() => {
    if (!me) return;
    const open = db.requests.filter((r) => !r.answeredAt);
    const visible = open.filter((r) => isLeaderRole(me.role) || r.audience === 'church' || r.ownerId === me.id);
    const waiting = visible.filter((r) => r.kind === 'request' && !r.prayedBy.some((p) => p.userId === me.id));
    const requests = visible.filter((r) => r.kind === 'request');
    set({ tab: 'pray', sessionSec: 0, praySession: { active: true, i: 0, done: 0, list: waiting.length ? waiting : requests } });
  }, [me, db.requests, set]);

  const nextInSession = useCallback(() => {
    setUi((s) => {
      if (!s.praySession) return s;
      const { list, i } = s.praySession;
      const p = list[i];
      if (p) prayFor(p.id);
      const done = s.praySession.done + 1;
      const finished = i >= list.length - 1;
      return { ...s, praySession: finished ? { active: false, i, done, list } : { active: true, i: i + 1, done, list } };
    });
  }, [prayFor]);

  const skipInSession = useCallback(() => {
    setUi((s) => {
      if (!s.praySession) return s;
      const { list, i, done } = s.praySession;
      const finished = i >= list.length - 1;
      return { ...s, praySession: finished ? { active: false, i, done, list } : { active: true, i: i + 1, done, list } };
    });
  }, []);

  const endSession = useCallback(() => {
    setUi((s) => (s.praySession ? { ...s, praySession: { ...s.praySession, active: false } } : s));
  }, []);

  const value: AppContextValue = {
    db,
    ui,
    currentUser,
    set,
    say,
    goTab,
    onSigninPhone,
    onSigninName,
    onSigninPassword,
    phoneKnown: ui.phoneKnown,
    doSignIn,
    requestCode,
    codePress,
    backToSignin,
    pinPress,
    setPinPress,
    signOut,
    changePassword,
    postRequest,
    openRequestDetail,
    closeRequestDetail,
    postComment,
    toggleAnswered,
    deleteRequest,
    prayFor,
    markAllRead,
    enableNotifications,
    dismissNotifPrompt,
    acceptNotifPrompt,
    setRole,
    sendBroadcast,
    exportCsv,
    transferOwnership,
    deleteChurch,
    startPraySession,
    nextInSession,
    skipInSession,
    endSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
