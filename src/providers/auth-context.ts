import { createContext, useContext } from 'react';

/**
 * Fake auth: lets you click through the app without Supabase.
 * On when EXPO_PUBLIC_FAKE_AUTH=true, or automatically when there's no Supabase URL in .env.
 * Any email/password that passes validation "signs you in"; Sign out on Profile signs you out.
 */
export const FAKE_AUTH =
  process.env.EXPO_PUBLIC_FAKE_AUTH === 'true' || !process.env.EXPO_PUBLIC_SUPABASE_URL;

export interface AuthResult {
  /** Message to show the user, or null if it worked */
  error: string | null;
}

export interface SignUpResult extends AuthResult {
  /** True when Supabase created the account but wants the user to confirm their email first */
  needsEmailConfirmation: boolean;
}

export interface AuthContextValue {
  isSignedIn: boolean;
  /** True while we check for a saved session on app start */
  isLoading: boolean;
  email: string | null;
  isFakeAuth: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Use this in any screen to read the session or sign in/out. Works the same in fake and real mode. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
