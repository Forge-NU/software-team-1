import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button, FormTextField } from '@/components/ui';
import { signUpSchema, type SignUpValues } from '@/lib/validation/auth';
import { useAuth } from '@/providers/auth-context';

/** Figma "Sign Up/In" frame */
export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onTouched', // errors appear after leaving a field, and for every field on submit
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setNotice(null);
    const { error, needsEmailConfirmation } = await signUp(values);
    if (error) setFormError(error);
    else if (needsEmailConfirmation) {
      setNotice('Check your school email for a verification link, then sign in.');
    }
    // On success the auth gate in app/_layout.tsx switches to the tabs by itself
  });

  return (
    <AuthScaffold
      headerTitle="Create an account"
      title="Your city, your spots."
      subtitle="Use your school email to join your campus community."
      footnote="By joining, you agree to the Terms and Privacy Policy."
      actions={
        <>
          {formError ? (
            <Text accessibilityRole="alert" className="text-center font-sans text-label text-danger">
              {formError}
            </Text>
          ) : null}
          {notice ? (
            <Text className="text-center font-sans text-label text-success">{notice}</Text>
          ) : null}
          <Button title="Create account" onPress={onSubmit} loading={isSubmitting} />
          {/* TODO: Northeastern SSO isn't built yet. Until it is, this goes to email sign-in. */}
          <Button
            title="Sign in with Northeastern"
            variant="secondary"
            onPress={() => router.replace('/sign-in')}
          />
        </>
      }
    >
      <FormTextField
        control={control}
        name="name"
        label="Name"
        placeholder="Your name"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => setFocus('email')}
      />
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
        helper="At least 8 characters. We'll send a verification link to your school email."
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
    </AuthScaffold>
  );
}
