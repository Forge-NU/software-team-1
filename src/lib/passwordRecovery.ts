
let recoveryUserId: string | null = null;

// saves which user opened a valid reset link
export function allowPasswordRecovery(userId: string) {
  recoveryUserId = userId;
}

// checks if the user can reset their password
export function canResetPassword(userId: string | undefined) {
  return !!userId && recoveryUserId === userId;
}

// clears reset access after finishing
export function clearPasswordRecovery() {
  recoveryUserId = null;
}
