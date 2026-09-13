export const colors = {
  ground: '#f6f1e9',
  card: '#fdfaf4',
  darkGradTop: '#3a342a',
  darkGradBottom: '#292419',
  ink: '#26221d',
  inkSoft: '#6e675c',
  clay: '#8c6242',
  clayDeep: '#6b4526',
  clayLight: '#dcb98f',
  clayTint: 'rgba(140,98,66,.1)',
  clayTintBorder: 'rgba(140,98,66,.3)',
  danger: '#8a3f24',
  dangerBg: 'rgba(166,74,45,.1)',
  dangerBorder: 'rgba(166,74,45,.3)',
  dangerBad: '#c2724f',
  praise: '#4c5a37',
  praiseBg: 'rgba(107,122,82,.16)',
  praiseSolid: '#6b7a52',
  hairline: 'rgba(38,34,29,.1)',
  hairlineSoft: 'rgba(38,34,29,.07)',
  hairlineStrong: 'rgba(38,34,29,.18)',
  overlay: 'rgba(38,34,29,.42)',
};

export const dots = ['#8c6242', '#6b7a52', '#2f2a20', '#a8734a', '#5d6b7a', '#7a5f8c'];

export const radius = {
  card: 24,
  row: 18,
  pill: 999,
};

export const shadow = {
  light: {
    shadowColor: '#26221d',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  dark: {
    shadowColor: '#26221d',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
};

export const font = {
  family: undefined, // system font; Barlow can be added later via expo-font
};

export function dotFor(id: string): string {
  const sum = String(id)
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return dots[Math.abs(sum) % dots.length];
}

export function initialOf(n: string): string {
  return String(n).replace(/^The /, '').trim().charAt(0).toUpperCase();
}

// "Travis Medlin" -> "Travis M." — used where a full name is too much detail.
export function firstNameLastInitial(n: string): string {
  const parts = String(n).trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
