import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getMyProfile, updateDisplayName } from '../lib/profile'
import type { Profile } from '../types/profile'

interface ProfileContextValue {
  profile: Profile | null
  loading: boolean
  refresh: () => Promise<void>
  setDisplayName: (name: string) => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

/**
 * Wrap the app in this. Any screen that shows the user's name (Profile,
 * the "Thanks, [name]!" screen) should read it from useProfile() so a
 * rename shows up everywhere right away.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    refresh()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setProfile(null)
      if (event === 'SIGNED_IN') {
        setLoading(true)
        refresh()
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [refresh])

  const setDisplayName = useCallback(async (name: string) => {
    const saved = await updateDisplayName(name)
    setProfile((prev) => (prev ? { ...prev, displayName: saved } : prev))
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh, setDisplayName }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>')
  return ctx
}
