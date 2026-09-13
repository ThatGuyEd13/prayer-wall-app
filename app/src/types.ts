export type Role = 'member' | 'prayer_team' | 'agricultural_minister' | 'worship_minister' | 'pastor' | 'lead_pastor' | 'owner';

export const ROLE_LADDER: Role[] = ['member', 'prayer_team', 'agricultural_minister', 'worship_minister', 'pastor', 'lead_pastor'];

export const ROLE_LABEL: Record<Role, string> = {
  member: 'Member',
  prayer_team: 'Prayer team',
  agricultural_minister: 'Agricultural minister',
  worship_minister: 'Worship minister',
  pastor: 'Pastor',
  lead_pastor: 'Lead pastor',
  owner: 'Owner',
};

export function isLeaderRole(role: Role): boolean {
  return (
    role === 'pastor' ||
    role === 'agricultural_minister' ||
    role === 'worship_minister' ||
    role === 'lead_pastor' ||
    role === 'owner'
  );
}
// "Sees the Admin tab" — lead pastor and owner have full admin access; the
// specialty ministers (agricultural, worship) get the same admin tab
// (broadcasts, export, People list) except changing anyone's role (see
// canManageRoles below).
export function isAdminRole(role: Role): boolean {
  return role === 'lead_pastor' || role === 'owner' || role === 'agricultural_minister' || role === 'worship_minister';
}
// "Can change a member's role / promote someone to pastor" — lead pastor
// and owner only. The agricultural minister does not get this, even though
// it otherwise has full admin access.
export function canManageRoles(role: Role): boolean {
  return role === 'lead_pastor' || role === 'owner';
}
export function needsPin(role: Role): boolean {
  return isLeaderRole(role);
}

export interface User {
  id: string;
  name: string;
  role: Role;
  createdAt: number;
}

export type Audience = 'church' | 'pastors';
export type Kind = 'request' | 'praise';

export interface PrayerLogEntry {
  userId: string;
  name: string;
  at: number;
}

export interface Request {
  id: string;
  ownerId: string;
  ownerName: string;
  text: string;
  tag: string;
  audience: Audience;
  kind: Kind;
  createdAt: number;
  answeredAt: number | null;
  prayedBy: PrayerLogEntry[];
}

export interface Comment {
  id: string;
  requestId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  toUserId: string;
  title: string;
  body: string;
  createdAt: number;
  readAt: number | null;
}

export type AuthStep = 'signin' | 'code' | 'pin' | 'setpin' | 'authenticated';

export type AdminModal = null | 'broadcast' | 'export' | 'transfer' | 'billing' | 'delete';

export const TAGS = ['Sickness', 'Work', 'Family', 'Grief', 'Travel', 'Thanks'];

export const PROMPTS: Record<string, string> = {
  Sickness: 'Ask for steady hands on the doctors, rest through the night, and company in the waiting room.',
  Work: 'Ask for a clear head, an open door, and provision that comes before the worry does.',
  Family: 'Ask for patience under one roof, and that this house be a place people are glad to come back to.',
  Grief: 'You do not need words here. Sit with them a minute and ask that they not be left alone in it.',
  Travel: 'Ask for safe roads, alert eyes, and a good welcome on the other end.',
  Waiting: 'Ask for strength that outlasts the delay, and peace while nothing seems to move.',
  Thanks: 'Say thank you plainly, and name what it cost to wait for it.',
};
