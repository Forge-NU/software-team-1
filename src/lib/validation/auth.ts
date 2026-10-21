import { z } from 'zod';

const email = z.string().trim().min(1, 'Enter your email').email('Enter a valid email');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(50, 'Keep it under 50 characters'),
  email,
  // Supabase's default minimum is 6; 8 is stricter so the server never rejects what we accept
  password: z.string().min(1, 'Enter a password').min(8, 'Use at least 8 characters'),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
