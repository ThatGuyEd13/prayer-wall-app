import * as Crypto from 'expo-crypto';

export async function hashSecret(secret: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${secret}`);
}

export function digitsOnly(s: string): string {
  return String(s || '').replace(/\D/g, '');
}

export function normalizePhone(s: string): string {
  return digitsOnly(s).slice(-10);
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
