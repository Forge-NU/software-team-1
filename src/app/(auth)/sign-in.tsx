import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button, FormTextField } from '@/components/ui';
import { signInSchema, type SignInValues } from '@/lib/validation/auth';
import { useAuth } from '@/providers/auth-context';

/** No separate Figma frame yet; mirrors the sign-up layout. */
export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);
    const { error } = await signIn(email, password);
    if (error) setFormError(error);
  });

  return (
    <AuthScaffold
      headerTitle="Sign in"
      title="Welcome back."
      subtitle="Sign in with your school email."
      actions={
        <>
          {formError ? (
            <Text accessibilityRole="alert" className="text-center font-sans text-label text-danger">
              {formError}
            </Text>
          ) : null}
          <Button title="Sign in" onPress={onSubmit} loading={isSubmitting} />
          <Button
            title="Create an account"
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
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => setFocus('password')}
      />
      <FormTextField
        control={control}
        name="password"
        label="Password"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
    </AuthScaffold>
  );
}
