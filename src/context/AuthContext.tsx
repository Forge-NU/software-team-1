import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { useSession } from '@/hooks/useSession';
import * as auth from '@/lib/auth';

export interface AuthResult {
  /** A message to show the user, or null if it worked */
  error: string | null;
}

export interface SignUpResult extends AuthResult {
  /** The account was created but the user has to confirm their email before signing in */
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  session: Session | null;
  isSignedIn: boolean;
  /** True while the saved session is read on app start */
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<SignUpResult>;
  signOut: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Supabase's messages are written for developers; these are the ones users actually hit.
const FRIENDLY_ERRORS: Record<string, string> = {
  invalid_credentials: 'That email and password don’t match. Try again.',
  email_not_confirmed: 'Confirm your email first. Check your inbox for the link.',
  user_already_exists: 'An account with this email already exists. Sign in instead.',
  over_email_send_rate_limit: 'Too many emails sent. Wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a few minutes and try again.',
};

function toMessage(error: { code?: string; message: string } | null): string | null {
  if (!error) return null;
  return (error.code && FRIENDLY_ERRORS[error.code]) || error.message || 'Something went wrong. Try again.';
}

/**
 * Wrap the app in this. The session comes from Supabase (B-2's useSession), so signing in or
 * out anywhere, including Profile's sign out, updates every screen and the auth gate.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isSignedIn: session !== null,
      isLoading: loading,
      signIn: async (email, password) => {
        const { error } = await auth.signIn(email, password);
        return { error: toMessage(error) };
      },
      signUp: async ({ name, email, password }) => {
        const { data, error } = await auth.signUp(email, password, name);
        if (error) return { error: toMessage(error), needsEmailConfirmation: false };
        // With email confirmation on, Supabase doesn't say the email is taken (so accounts
        // can't be discovered); it returns a user with no identities instead.
        if (data.user && data.user.identities?.length === 0) {
          return { error: FRIENDLY_ERRORS.user_already_exists, needsEmailConfirmation: false };
        }
        return { error: null, needsEmailConfirmation: !data.session };
      },
      signOut: async () => {
        const { error } = await auth.signOut();
        return { error: toMessage(error) };
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Read the session or sign in / up / out from any screen. */
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
