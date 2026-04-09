import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const PASSWORD_KEY = '@mobo_password_hash';

export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password,
  );
}

export async function savePasswordHash(hash: string): Promise<void> {
  await AsyncStorage.setItem(PASSWORD_KEY, hash);
}

export async function getPasswordHash(): Promise<string | null> {
  return AsyncStorage.getItem(PASSWORD_KEY);
}

export async function clearPasswordHash(): Promise<void> {
  await AsyncStorage.removeItem(PASSWORD_KEY);
}

export async function verifyPassword(input: string): Promise<boolean> {
  const stored = await getPasswordHash();
  if (!stored) return true; // no password set
  const inputHash = await hashPassword(input);
  return inputHash === stored;
}

export async function hasPassword(): Promise<boolean> {
  const hash = await getPasswordHash();
  return !!hash;
}
