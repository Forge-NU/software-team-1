
import { z } from 'zod';

import { MAX_NAME_LENGTH } from '@/lib/profile';

// school domains are checked by supabase
const email = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .pipe(z.email('Enter a valid email'));

export const MIN_PASSWORD_LENGTH = 8;

// shared password rules for sign up and reset
export const passwordSchema = z
  .string()
  .min(1, 'Enter a password')
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number')
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};'\\:"|<>?,./`~]/,
    'Include a special character'
  );

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(MAX_NAME_LENGTH, `Keep it under ${MAX_NAME_LENGTH} characters`),
  email,
  password: passwordSchema,
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
