import { useMemo, useState, type PropsWithChildren } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context';

// In-memory session for development. Nothing is sent anywhere; reloading the app signs you out.
export function FakeAuthProvider({ children }: PropsWithChildren) {
  const [email, setEmail] = useState<string | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      isSignedIn: email !== null,
      isLoading: false,
      email,
      isFakeAuth: true,
      signIn: async (signInEmail) => {
        setEmail(signInEmail);
        return { error: null };
      },
      signUp: async ({ email: signUpEmail }) => {
        setEmail(signUpEmail);
        return { error: null, needsEmailConfirmation: false };
      },
      signOut: async () => {
        setEmail(null);
      },
    }),
    [email],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
