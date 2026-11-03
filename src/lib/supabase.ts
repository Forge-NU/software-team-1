// Allows Supabase to use URL features needed in React Native
import 'react-native-url-polyfill/auto';
// Saves user login information on their device
import AsyncStorage from '@react-native-async-storage/async-storage';
// Imports the function used to connect to Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Creates the connection between our app and Supabase
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // Stores login information on the user's device
      storage: AsyncStorage,
      // Allows Supabase to refresh expired login tokens
      autoRefreshToken: true,
      // Keeps users logged in when they close the app
      persistSession: true,
      // We aren't using browsxsr URL authentication
      detectSessionInUrl: false,
    },
  }
);
