import { z } from 'zod';

import { MAX_NAME_LENGTH } from '@/lib/profile';

// Only checks the shape. Which school domains are allowed is enforced by the server (B-13),
// so the list can change without an app release.
const email = z.string().trim().min(1, 'Enter your email').pipe(z.email('Enter a valid email'));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const MIN_PASSWORD_LENGTH = 8;

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(MAX_NAME_LENGTH, `Keep it under ${MAX_NAME_LENGTH} characters`),
  email,
  password: z
    .string()
    .min(1, 'Enter a password')
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
