import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
// Must exactly match an "Authorized redirect URI" on the Google OAuth
// client — using the page's own origin means this is automatically correct
// whether running on localhost during development or on the deployed URL.
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

const B64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64UrlEncode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64URL_CHARS[(n >> 18) & 63] + B64URL_CHARS[(n >> 12) & 63] + B64URL_CHARS[(n >> 6) & 63] + B64URL_CHARS[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64URL_CHARS[(n >> 18) & 63] + B64URL_CHARS[(n >> 12) & 63];
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64URL_CHARS[(n >> 18) & 63] + B64URL_CHARS[(n >> 12) & 63] + B64URL_CHARS[(n >> 6) & 63];
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function makePkcePair() {
  const verifierBytes = await Crypto.getRandomBytesAsync(64);
  const verifier = base64UrlEncode(verifierBytes);
  const challengeHex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  const challenge = base64UrlEncode(hexToBytes(challengeHex));
  return { verifier, challenge };
}

export async function connectGoogleSheets(): Promise<{ ok: boolean; error?: string }> {
  const { verifier, challenge } = await makePkcePair();

  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: 'Google sign-in was cancelled.' };
  }

  const code = new URL(result.url).searchParams.get('code');
  const err = new URL(result.url).searchParams.get('error');
  if (err) return { ok: false, error: err };
  if (!code) return { ok: false, error: 'No authorization code returned.' };

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false, error: 'Not signed in.' };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/google-oauth-connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: REDIRECT_URI }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error || 'Failed to connect Google Sheets.' };
  return { ok: true };
}

export async function exportToGoogleSheet(): Promise<{ ok: boolean; url?: string; error?: string; notConnected?: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false, error: 'Not signed in.' };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/export-to-sheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) {
    return { ok: false, error: json.message || json.error || 'Export failed.', notConnected: json.error === 'not_connected' };
  }
  return { ok: true, url: json.spreadsheetUrl };
}
