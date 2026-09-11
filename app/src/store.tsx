import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashSecret, normalizePhone, genId } from './crypto';
import {
  AdminModal,
  Audience,
  AuthStep,
  Notification,
  PrayerLogEntry,
  Request,
  Role,
  ROLE_LADDER,
  User,
  isAdminRole,
  isLeaderRole,
  needsPin,
} from './types';

const STORAGE_KEY = 'prayerwall:v1';
const CODE_TTL_MS = 10 * 60 * 1000;

interface DB {
  users: User[];
  requests: Request[];
  notifications: Notification[];
}

const emptyDb: DB = { users: [], requests: [], notifications: [] };

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

  signinPhone: string;
  signinName: string;
  signinPassword: string;
  signinError: string;

  devCode: string | null;
  devCodeExpires: number;
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

  adminModal: AdminModal;
  broadcastText: string;
  transferPick: string;
  deleteText: string;

  toast: string;
  praySession: PraySession | null;
  sessionSec: number;
}

const initialUI: UIState = {
  loaded: false,
  auth: 'signin',
  sessionUserId: null,
  signinPhone: '',
  signinName: '',
  signinPassword: '',
  signinError: '',
  devCode: null,
  devCodeExpires: 0,
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
  adminModal: null,
  broadcastText: '',
  transferPick: '',
  deleteText: '',
  toast: '',
  praySession: null,
  sessionSec: 0,
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

  postRequest: () => Promise<void>;
  toggleAnswered: (id: string) => void;
  prayFor: (id: string) => void;
  markAllRead: () => void;

  cycleRole: (userId: string) => void;
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
  const dbRef = useRef(db);
  dbRef.current = db;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setDb(JSON.parse(raw));
      } finally {
        setUi((s) => ({ ...s, loaded: true }));
      }
    })();
  }, []);

  const persist = useCallback((next: DB) => {
    setDb(next);
    dbRef.current = next;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const set = useCallback((patch: Partial<UIState>) => setUi((s) => ({ ...s, ...patch })), []);

  const say = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setUi((s) => ({ ...s, toast: msg }));
    toastTimer.current = setTimeout(() => setUi((s) => ({ ...s, toast: '' })), 3200);
  }, []);

  useEffect(() => {
    sessionTimer.current = setInterval(() => {
      setUi((s) => (s.praySession && s.praySession.active ? { ...s, sessionSec: s.sessionSec + 1 } : s));
    }, 1000);
    return () => {
      if (sessionTimer.current) clearInterval(sessionTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const currentUser = useMemo(
    () => db.users.find((u) => u.id === ui.sessionUserId) || null,
    [db.users, ui.sessionUserId],
  );

  const goTab = useCallback((tab: UIState['tab']) => set({ tab }), [set]);

  const lookupByPhone = useCallback(
    (phone: string): User | null => {
      const d = normalizePhone(phone);
      if (d.length < 10) return null;
      return dbRef.current.users.find((u) => u.phone === d) || null;
    },
    [],
  );

  const phoneKnown = useMemo(() => !!lookupByPhone(ui.signinPhone), [ui.signinPhone, lookupByPhone, db.users]);

  const onSigninPhone = useCallback((v: string) => set({ signinPhone: v, signinError: '' }), [set]);
  const onSigninName = useCallback((v: string) => set({ signinName: v, signinError: '' }), [set]);
  const onSigninPassword = useCallback((v: string) => set({ signinPassword: v, signinError: '' }), [set]);

  const proceedPastCredentials = useCallback(
    (user: User) => {
      if (needsPin(user.role)) {
        if (!user.pinHash) {
          set({
            auth: 'setpin',
            sessionUserId: user.id,
            setPinEntry: '',
            setPinConfirm: '',
            setPinStage: 'first',
            setPinError: '',
          });
        } else {
          set({ auth: 'pin', sessionUserId: user.id, pinEntry: '', pinMessage: '', pinBad: false });
        }
      } else {
        set({ auth: 'authenticated', sessionUserId: user.id, tab: 'wall' });
      }
    },
    [set],
  );

  const doSignIn = useCallback(async () => {
    const phone = normalizePhone(ui.signinPhone);
    if (phone.length < 10) {
      set({ signinError: 'Enter a 10-digit phone number.' });
      return;
    }
    const existing = lookupByPhone(phone);
    if (existing) {
      const hash = await hashSecret(ui.signinPassword, existing.id);
      if (hash !== existing.passwordHash) {
        set({ signinError: 'That password doesn’t match this number. Try again.' });
        return;
      }
      set({ signinPassword: '', signinError: '' });
      proceedPastCredentials(existing);
      return;
    }
    // First-time flow: create the account.
    const name = ui.signinName.trim();
    if (!name) {
      set({ signinError: 'Enter your name to set up this account.' });
      return;
    }
    if (!ui.signinPassword || ui.signinPassword.length < 4) {
      set({ signinError: 'Choose a password with at least 4 characters.' });
      return;
    }
    const isFirstEverUser = dbRef.current.users.length === 0;
    const id = genId('u');
    const passwordHash = await hashSecret(ui.signinPassword, id);
    const user: User = {
      id,
      name,
      phone,
      passwordHash,
      pinHash: null,
      role: isFirstEverUser ? 'owner' : 'member',
      createdAt: Date.now(),
    };
    persist({ ...dbRef.current, users: dbRef.current.users.concat([user]) });
    set({ signinPassword: '', signinError: '' });
    proceedPastCredentials(user);
  }, [ui.signinPhone, ui.signinPassword, ui.signinName, lookupByPhone, persist, proceedPastCredentials, set]);

  const requestCode = useCallback(() => {
    const existing = lookupByPhone(ui.signinPhone);
    if (!existing) {
      set({ signinError: 'Enter a number we have on file and we can text it a code.' });
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    set({
      auth: 'code',
      sessionUserId: existing.id,
      devCode: code,
      devCodeExpires: Date.now() + CODE_TTL_MS,
      codeEntry: '',
      codeMessage: '',
      codeBad: false,
      signinError: '',
    });
    say(`Demo SMS — your code is ${code} (a real build texts this via Twilio)`);
  }, [ui.signinPhone, lookupByPhone, set, say]);

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
        if (next.length < 6) return { ...s, codeEntry: next, codeMessage: '', codeBad: false };
        const expired = Date.now() > s.devCodeExpires;
        const ok = !expired && next === s.devCode;
        if (ok) {
          const user = dbRef.current.users.find((u) => u.id === s.sessionUserId);
          setTimeout(() => {
            set({ codeEntry: '', codeMessage: '' });
            if (user) proceedPastCredentials(user);
          }, 460);
          return { ...s, codeEntry: next, codeMessage: 'Code accepted', codeBad: false };
        }
        setTimeout(() => set({ codeEntry: '' }), 500);
        return {
          ...s,
          codeEntry: next,
          codeMessage: expired ? 'That code expired. Request a new one.' : 'That code isn’t right.',
          codeBad: true,
        };
      });
    },
    [set, proceedPastCredentials],
  );

  const backToSignin = useCallback(() => {
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
      const user = dbRef.current.users.find((u) => u.id === ui.sessionUserId);
      if (!user || !user.pinHash) return;
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
        const cur = ui.pinEntry + k;
        if (cur.length < 5) return;
        const hash = await hashSecret(cur, user.id + ':pin');
        if (hash === user.pinHash) {
          set({ pinEntry: cur, pinMessage: 'Unlocked', pinBad: false });
          setTimeout(() => set({ auth: 'authenticated', tab: 'wall', pinEntry: '', pinMessage: '' }), 420);
        } else {
          set({ pinEntry: cur, pinMessage: 'That PIN is not right. Try again.', pinBad: true });
          setTimeout(() => set({ pinEntry: '' }), 500);
        }
      })();
    },
    [ui.sessionUserId, ui.pinEntry, set],
  );

  const setPinPress = useCallback(
    (k: string) => {
      const user = dbRef.current.users.find((u) => u.id === ui.sessionUserId);
      if (!user) return;
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
              const hash = await hashSecret(nextConfirm, user.id + ':pin');
              persist({
                ...dbRef.current,
                users: dbRef.current.users.map((u) => (u.id === user.id ? { ...u, pinHash: hash } : u)),
              });
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
    [ui.sessionUserId, set, persist],
  );

  const signOut = useCallback(() => {
    set({ ...initialUI, loaded: true });
  }, [set]);

  const me = currentUser;

  const postRequest = useCallback(async () => {
    if (!me) return;
    const text = ui.draftText.trim();
    if (!text) return;
    const req: Request = {
      id: genId('r'),
      ownerId: me.id,
      ownerName: me.name,
      text,
      tag: ui.draftTag,
      audience: ui.draftAudience,
      kind: 'request',
      createdAt: Date.now(),
      answeredAt: null,
      prayedBy: [],
    };
    persist({ ...dbRef.current, requests: dbRef.current.requests.concat([req]) });
    set({ composeOpen: false, draftText: '', tab: 'mine' });
    say(ui.draftAudience === 'pastors' ? 'Sent. Only the pastors can see it.' : 'Posted. The whole church can see it.');
  }, [me, ui.draftText, ui.draftTag, ui.draftAudience, persist, set, say]);

  const toggleAnswered = useCallback(
    (id: string) => {
      persist({
        ...dbRef.current,
        requests: dbRef.current.requests.map((r) =>
          r.id === id ? { ...r, answeredAt: r.answeredAt ? null : Date.now() } : r,
        ),
      });
    },
    [persist],
  );

  const prayFor = useCallback(
    (id: string) => {
      if (!me || !isLeaderRole(me.role)) return;
      const req = dbRef.current.requests.find((r) => r.id === id);
      if (!req) return;
      const already = req.prayedBy.some((p) => p.userId === me.id);
      if (already) {
        persist({
          ...dbRef.current,
          requests: dbRef.current.requests.map((r) =>
            r.id === id ? { ...r, prayedBy: r.prayedBy.filter((p) => p.userId !== me.id) } : r,
          ),
        });
        return;
      }
      const entry: PrayerLogEntry = { userId: me.id, name: me.name, at: Date.now() };
      const notif: Notification = {
        id: genId('n'),
        toUserId: req.ownerId,
        title: `${me.name} prayed for you`,
        body: `On your request: "${req.text.slice(0, 60)}${req.text.length > 60 ? '…' : ''}"`,
        createdAt: Date.now(),
        readAt: null,
      };
      persist({
        ...dbRef.current,
        requests: dbRef.current.requests.map((r) => (r.id === id ? { ...r, prayedBy: r.prayedBy.concat([entry]) } : r)),
        notifications: [notif].concat(dbRef.current.notifications),
      });
      say(`${req.ownerName} gets a note: "${me.name} prayed for you."`);
    },
    [me, persist, say],
  );

  const markAllRead = useCallback(() => {
    if (!me) return;
    persist({
      ...dbRef.current,
      notifications: dbRef.current.notifications.map((n) => (n.toUserId === me.id ? { ...n, readAt: Date.now() } : n)),
    });
  }, [me, persist]);

  const cycleRole = useCallback(
    (userId: string) => {
      if (!me) return;
      const target = dbRef.current.users.find((u) => u.id === userId);
      if (!target) return;
      if (target.role === 'owner') {
        say('Only the owner can hand off ownership.');
        return;
      }
      if (target.role === 'lead_pastor' && me.role !== 'owner') {
        say('Only the owner can change a lead pastor.');
        return;
      }
      const i = ROLE_LADDER.indexOf(target.role);
      let next: Role = ROLE_LADDER[(i + 1) % ROLE_LADDER.length];
      if (me.role === 'owner' && target.role === 'pastor') next = 'lead_pastor';
      persist({ ...dbRef.current, users: dbRef.current.users.map((u) => (u.id === userId ? { ...u, role: next, pinHash: isLeaderRole(next) ? u.pinHash : null } : u)) });
      const label = next === 'member' ? 'a member' : next === 'lead_pastor' ? 'a lead pastor' : `a ${next.replace('_', ' ')}`;
      say(`${target.name} is now ${label}.`);
    },
    [me, persist, say],
  );

  const sendBroadcast = useCallback(() => {
    const text = ui.broadcastText.trim();
    if (!text || !me) return;
    const notifs: Notification[] = dbRef.current.users.map((u) => ({
      id: genId('n'),
      toUserId: u.id,
      title: `Notice from ${me.name}`,
      body: text,
      createdAt: Date.now(),
      readAt: null,
    }));
    persist({ ...dbRef.current, notifications: notifs.concat(dbRef.current.notifications) });
    set({ adminModal: null, broadcastText: '' });
    say('Sent to everyone.');
  }, [ui.broadcastText, me, persist, set, say]);

  const exportCsv = useCallback(async (): Promise<string> => {
    const rows = [['name', 'timestamp', 'tag', 'audience', 'kind', 'prayed', 'text']];
    dbRef.current.requests.forEach((r) => {
      rows.push([
        r.ownerName,
        new Date(r.createdAt).toISOString(),
        r.tag,
        r.audience === 'church' ? 'Whole church' : 'Pastors only',
        r.kind,
        r.prayedBy.length > 0 ? 'yes' : 'no',
        r.text.replace(/"/g, '""'),
      ]);
    });
    return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  }, []);

  const transferOwnership = useCallback(
    (userId: string) => {
      if (!me || me.role !== 'owner') return;
      const target = dbRef.current.users.find((u) => u.id === userId);
      if (!target) return;
      persist({
        ...dbRef.current,
        users: dbRef.current.users.map((u) => {
          if (u.id === me.id) return { ...u, role: 'lead_pastor' };
          if (u.id === userId) return { ...u, role: 'owner' };
          return u;
        }),
      });
      set({ adminModal: null, transferPick: '' });
      say(`${target.name} is now the owner. You are lead pastor.`);
    },
    [me, persist, set, say],
  );

  const deleteChurch = useCallback(() => {
    if (!me || me.role !== 'owner') return;
    persist(emptyDb);
    signOut();
  }, [me, persist, signOut]);

  const startPraySession = useCallback(() => {
    if (!me) return;
    const open = dbRef.current.requests.filter((r) => !r.answeredAt);
    const visible = open.filter((r) => isLeaderRole(me.role) || r.audience === 'church' || r.ownerId === me.id);
    const waiting = visible.filter((r) => r.kind === 'request' && !r.prayedBy.some((p) => p.userId === me.id));
    const requests = visible.filter((r) => r.kind === 'request');
    set({ tab: 'pray', sessionSec: 0, praySession: { active: true, i: 0, done: 0, list: waiting.length ? waiting : requests } });
  }, [me, set]);

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
    phoneKnown,
    doSignIn,
    requestCode,
    codePress,
    backToSignin,
    pinPress,
    setPinPress,
    signOut,
    postRequest,
    toggleAnswered,
    prayFor,
    markAllRead,
    cycleRole,
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
