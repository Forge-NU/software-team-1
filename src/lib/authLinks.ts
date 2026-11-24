
import { supabase } from './supabase';

type AuthLinkResult = {
  error: string | null;
  recovery: boolean;
};

export async function handleAuthLink(
  url: string
): Promise<AuthLinkResult> {
  const fragment = url.split('#')[1] ?? '';
  const query = url.split('?')[1]?.split('#')[0] ?? '';

  const params = new URLSearchParams(query || fragment);

  const tokenHash = params.get('token_hash');
  const type = params.get('type');

  const recovery = type === 'recovery';

  if (params.get('error_description')) {
    return {
      error: params.get('error_description'),
      recovery,
    };
  }

  // Handle token-hash email links
  if (
    tokenHash &&
    (type === 'recovery' ||
      type === 'signup' ||
      type === 'email')
  ) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    return {
      error: error?.message ?? null,
      recovery,
    };
  }

  // Handle standard Supabase redirect fragments
  const fragmentParams = new URLSearchParams(fragment);

  const access_token = fragmentParams.get('access_token');
  const refresh_token = fragmentParams.get('refresh_token');

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    return {
      error: error?.message ?? null,
      recovery:
        recovery ||
        fragmentParams.get('type') === 'recovery',
    };
  }

  return {
    error: 'This authentication link is invalid or expired.',
    recovery,
  };
}
