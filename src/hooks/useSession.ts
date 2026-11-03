// useState stores information that can change
// useEffect runs code when the component starts
import { useEffect, useState } from 'react';

import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Custom hook that tracks the user's login session
export function useSession() {

  // Stores the user's session
  // null means no user is logged in
  const [session, setSession] = useState<Session | null>(null);

  // True while we're checking the initial login status
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // Listen for login changes and the initial saved session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {

        // Save the newest session
        setSession(newSession);

        // We now know the user's login status
        setLoading(false);
      }
    );

    // Stop listening when the component stops using this hook
    return () => {
      subscription.unsubscribe();
    };

  }, []);

  // Let other components access the session and loading status
  return { session, loading };
}