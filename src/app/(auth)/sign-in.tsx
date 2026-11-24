
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthScaffold } from '@/components/AuthScaffold';
import { FormMessage } from '@/components/FormMessage';
import { Button, FormTextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { signInSchema, type SignInValues } from '@/lib/validation/auth';

// sign in uses the same layout as sign up
export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);

    const result = await signIn(email, password);
    setError(result.error);

    // auth gate opens the tabs after signing in
  });

  return (
    <AuthScaffold
      headerTitle="Sign in"
      title="Welcome back."
      subtitle="Sign in with your school email."
      actions={
        <>
          <FormMessage message={error} tone="error" />

          <Button
            label="Sign in"
            onPress={onSubmit}
            loading={isSubmitting}
          />

          {/* takes user to forgot password screen */}
          <Button
            label="Forgot Password?"
            variant="secondary"
            onPress={() => router.push('/forgot-password')}
          />

          <Button
            label="Create an account"
            variant="secondary"
            onPress={() => router.replace('/sign-up')}
          />
        </>
      }
    >
      <FormTextField
        control={control}
        name="email"
        label="School email"
        placeholder="you@northeastern.edu"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => setFocus('password')}
      />

      <FormTextField
        control={control}
        name="password"
        label="Password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => onSubmit()}
      />
    </AuthScaffold>
  );
}
