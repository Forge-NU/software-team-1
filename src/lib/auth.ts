
import { supabase } from './supabase';
import { AUTH_CALLBACK_URL } from './authLinks';

// Create a new account
export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  return await supabase.auth.signUp({
    email: email.trim(),
    password,

    options: {
      // Saves extra user information during sign-up
      // handle_new_user() copies `name` into public.users (it ignores other keys)
      data: {
        name: displayName,
      },

      // Confirmation emails redirect into Spotted
      emailRedirectTo: AUTH_CALLBACK_URL,
    },
  });
}

// Sign in existing user
export async function signIn(
  email: string,
  password: string
) {
  return await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
}

// Sign out
export async function signOut() {
  return await supabase.auth.signOut();
}

// Send password reset email
export async function requestPasswordReset(
  email: string
) {
  return await supabase.auth.resetPasswordForEmail(
    email.trim(),
    {
      redirectTo: AUTH_CALLBACK_URL,
    }
  );
}

// Update password after a recovery link
export async function updatePassword(
  password: string
) {
  return await supabase.auth.updateUser({
    password,
  });
}

/**
 * Deletes the signed-in user's account and data via the delete-account Edge
 * Function, then clears the local session. The service role stays server-side.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) {
    throw new Error(error.message || "Couldn't delete your account. Try again.");
  }

  const { error: signOutError } = await signOut();
  if (signOutError) throw signOutError;
}
