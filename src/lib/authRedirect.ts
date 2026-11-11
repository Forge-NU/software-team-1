import * as Linking from 'expo-linking';

/**
 * Where sign-up confirmation and password reset emails send the user.
 * In a build this is spotted:///auth/callback; in Expo Go it is exp://<dev server>/--/auth/callback,
 * since Expo Go can't open spotted:// links. Supabase only redirects to URLs on its allow list,
 * so the hosted project's Redirect URLs (Auth > URL Configuration) need both spotted://** and exp://**.
 *
 * Kept apart from auth.ts so backend tests can stub it (see supabase/deno.json).
 */
export function authCallbackUrl(): string {
  return Linking.createURL('/auth/callback');
}
