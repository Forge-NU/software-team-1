
// Imports our Supabase connection from supabase.ts
import { supabase } from './supabase';

// Creates a new user account
// Takes the user's email, password, and display name
export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  // Asks Supabase to create a new account
  return await supabase.auth.signUp({ 
    email: email,
    password: password,

    options: {
      // Saves extra user information during sign-up
      // The database can use this to create a profile
      data: {
        display_name: displayName,
      },
    },
  });
}

// Signs in an existing user
// Takes their email and password
export async function signIn(
  email: string,
  password: string
) {
  // Sends the login information to Supabase
  // Supabase checks whether the credentials are valid
  return await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
}

// Signs out the currently logged-in user
export async function signOut() {
  return await supabase.auth.signOut(); // end session
}
