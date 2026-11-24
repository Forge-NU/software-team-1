import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getMyProfile, getPreferences, updateDisplayName, updatePreferences } from '../lib/profile'
import type { Preferences, Profile } from '../types/profile'

interface ProfileContextValue {
  profile: Profile | null
  loading: boolean
  refresh: () => Promise<void>
  setDisplayName: (name: string) => Promise<void>
  /** Null until first loaded. Kept between screens so they can show it while refreshing. */
  preferences: Preferences | null
  /** Fetches the latest preferences without clearing the ones already shown. Throws on failure. */
  refreshPreferences: () => Promise<void>
  /** Shows the change right away, saves it, and puts the old value back if the save fails (then throws). */
  savePreferences: (changes: Partial<Preferences>) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

/**
 * Wrap the app in this. Any screen that shows the user's name (Profile,
 * the "Thanks, [name]!" screen) or preferences (Settings, Study preferences)
 * should read them from useProfile() so a change shows up everywhere right away.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [preferences, setPreferencesState] = useState<Preferences | null>(null)

  // Mirrors `preferences` so savePreferences can read the current value synchronously
  const preferencesRef = useRef<Preferences | null>(null)
  // Bumped by every save and sign out, so a fetch that started earlier can't overwrite newer state
  const preferencesVersion = useRef(0)

  const setPreferences = useCallback((next: Preferences | null) => {
    preferencesRef.current = next
    setPreferencesState(next)
  }, [])

  // `loading` is only true until a profile is first known, so refreshing an
  // already-loaded profile (e.g. when Profile regains focus) doesn't blank the screen
  const refresh = useCallback(async () => {
    try {
      setProfile(await getMyProfile())
    } catch (e) {
      console.error('Failed to load profile', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshPreferences = useCallback(async () => {
    const version = preferencesVersion.current
    const latest = await getPreferences()
    if (version === preferencesVersion.current) setPreferences(latest)
  }, [setPreferences])

  const savePreferences = useCallback(
    async (changes: Partial<Preferences>) => {
      const previous = preferencesRef.current
      if (previous) setPreferences({ ...previous, ...changes })
      const version = ++preferencesVersion.current
      try {
        const saved = await updatePreferences(changes)
        if (version === preferencesVersion.current) setPreferences(saved)
      } catch (e) {
        if (version === preferencesVersion.current) setPreferences(previous)
        throw e
      }
    },
    [setPreferences],
  )

  useEffect(() => {
    refresh()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        // So the next account never sees this one's preferences
        preferencesVersion.current++
        setPreferences(null)
      }
      if (event === 'SIGNED_IN') {
        setLoading(true)
        refresh()
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [refresh, setPreferences])

  const setDisplayName = useCallback(async (name: string) => {
    const saved = await updateDisplayName(name)
    setProfile((prev) => (prev ? { ...prev, displayName: saved } : prev))
  }, [])

  return (
    <ProfileContext.Provider
      value={{ profile, loading, refresh, setDisplayName, preferences, refreshPreferences, savePreferences }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>')
  return ctx
}
