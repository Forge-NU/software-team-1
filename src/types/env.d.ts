/// <reference types="expo/types" />

// Typed EXPO_PUBLIC_* variables from .env (see .env.example). Expo inlines them at build time.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  }
}
