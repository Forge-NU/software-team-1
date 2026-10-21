import type { ComponentType, PropsWithChildren } from 'react';

import { FAKE_AUTH } from './auth-context';
import { FakeAuthProvider } from './FakeAuthProvider';

// The Supabase provider is required only when it's used: lib/supabase.ts throws on import
// when .env has no URL, and fake mode has to work without a .env.
export const AuthProvider: ComponentType<PropsWithChildren> = FAKE_AUTH
  ? FakeAuthProvider
  : require('./SupabaseAuthProvider').SupabaseAuthProvider;
