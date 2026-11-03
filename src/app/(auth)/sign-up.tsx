import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthScaffold } from '@/components/AuthScaffold';
import { FormMessage } from '@/components/FormMessage';
import { Button, FormTextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { MIN_PASSWORD_LENGTH, signUpSchema, type SignUpValues } from '@/lib/validation/auth';

/** Figma "Sign Up/In" frame */
export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);

  const {
    control,
    handleSubmit,
    setFocus,
    resetField,
    formState: { isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
    // Errors show after leaving a field, and for every field on submit
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    const { error, needsEmailConfirmation } = await signUp(values);
    if (error) {
      setMessage({ text: error, tone: 'error' });
    } else if (needsEmailConfirmation) {
      resetField('password');
      setMessage({ text: `Check ${values.email} for a verification link, then sign in.`, tone: 'info' });
    }
    // Otherwise the user is signed in and the auth gate in app/_layout.tsx opens the tabs
  });

  return (
    <AuthScaffold
      headerTitle="Create an account"
      title="Your city, your spots."
      subtitle="Use your school email to join your campus community."
      footnote="By joining, you agree to the Terms and Privacy Policy."
      actions={
        <>
          <FormMessage message={message?.text ?? null} tone={message?.tone ?? 'error'} />
          <Button label="Create account" onPress={onSubmit} loading={isSubmitting} />
          {/* Figma says "Sign in with Northeastern"; that SSO doesn't exist, so this is email sign in for now. */}
          <Button label="Sign in" variant="secondary" onPress={() => router.replace('/sign-in')} />
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
        submitBehavior="submit"
        onSubmitEditing={() => setFocus('email')}
      />
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
        helper={`At least ${MIN_PASSWORD_LENGTH} characters. We’ll send a verification link to your school email.`}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
    </AuthScaffold>
  );
}
