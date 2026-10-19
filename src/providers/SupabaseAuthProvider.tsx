import { useMemo, type PropsWithChildren } from 'react';

import { useSession } from '@/hooks/useSession';
import * as auth from '@/lib/auth';

import { AuthContext, type AuthContextValue } from './auth-context';

// Real auth: B-2's useSession() + the helpers in lib/auth.ts.
// We never set the session by hand here. Supabase's onAuthStateChange (inside useSession)
// updates it after sign in/out, and the auth gate in app/_layout.tsx reacts to that.
export function SupabaseAuthProvider({ children }: PropsWithChildren) {
  const { session, loading } = useSession();

  const value = useMemo<AuthContextValue>(
    () => ({
      isSignedIn: session !== null,
      isLoading: loading,
      email: session?.user.email ?? null,
      isFakeAuth: false,
      signIn: async (email, password) => {
        const { error } = await auth.signIn(email, password);
        return { error: error?.message ?? null };
      },
      signUp: async ({ name, email, password }) => {
        const { data, error } = await auth.signUp(email, password, name);
        return {
          error: error?.message ?? null,
          // With email confirmation on, Supabase returns a user but no session
          needsEmailConfirmation: !error && !data.session,
        };
      },
      signOut: async () => {
        await auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
