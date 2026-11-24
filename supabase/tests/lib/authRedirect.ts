// Stands in for src/lib/authRedirect.ts (mapped in deno.json), which imports expo-linking.

export function authCallbackUrl(): string {
  return 'spotted:///auth/callback'
}
