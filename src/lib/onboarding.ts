import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// First-run flags, stored on the device. They only decide what to show, so if storage
// fails the app carries on instead of blocking the user.
const WELCOME_SEEN_KEY = 'spotted.welcomeSeen';
const PREFERENCES_PENDING_KEY = 'spotted.preferencesPending';

// ---------- Welcome carousel ----------

/** null until read from storage */
let welcomeSeen: boolean | null = null;
const listeners = new Set<() => void>();

function setWelcomeSeen(value: boolean) {
  welcomeSeen = value;
  listeners.forEach((listener) => listener());
}

async function loadWelcomeSeen() {
  try {
    setWelcomeSeen((await AsyncStorage.getItem(WELCOME_SEEN_KEY)) !== null);
  } catch {
    // Better to skip the carousel than show it on every launch
    setWelcomeSeen(true);
  }
}

/** Whether the welcome carousel has been shown on this device. null while loading. */
export function useWelcomeSeen(): boolean | null {
  useEffect(() => {
    if (welcomeSeen === null) loadWelcomeSeen();
  }, []);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => welcomeSeen,
  );
}

/** Call when the user leaves the carousel, so it only shows on first launch. */
export async function markWelcomeSeen() {
  setWelcomeSeen(true);
  try {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
  } catch {
    // Shown again next launch at worst
  }
}

// ---------- Study preferences after sign-up ----------

/** Call after a successful sign-up, so Study preferences opens once the user is in. */
export async function markPreferencesPending() {
  try {
    await AsyncStorage.setItem(PREFERENCES_PENDING_KEY, 'true');
  } catch {
    // The user can still set preferences later from Settings
  }
}

/** Undo markPreferencesPending, e.g. when the sign-up failed. */
export async function clearPreferencesPending() {
  try {
    await AsyncStorage.removeItem(PREFERENCES_PENDING_KEY);
  } catch {
    // At worst an existing user sees the optional preferences screen once
  }
}

/** True once per sign-up: reading it clears it. */
export async function takePreferencesPending(): Promise<boolean> {
  try {
    const pending = (await AsyncStorage.getItem(PREFERENCES_PENDING_KEY)) !== null;
    if (pending) await AsyncStorage.removeItem(PREFERENCES_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}
