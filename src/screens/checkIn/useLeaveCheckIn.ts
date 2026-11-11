import { useCallback } from 'react'
import { Alert, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useCheckIn } from '../../context/CheckInContext'

/**
 * Ends the check-in: pops the Check in tab back to search, clears the answers,
 * then runs `then` (e.g. go to Explore or open the spot).
 */
export function useLeaveCheckIn() {
  const router = useRouter()
  const { reset } = useCheckIn()

  return useCallback(
    (then?: () => void) => {
      if (router.canDismiss()) router.dismissTo('/check-in')
      reset()
      then?.()
    },
    [router, reset]
  )
}

/** Header "Cancel": asks before discarding a photo or answers, then goes to Explore. */
export function useCancelCheckIn() {
  const router = useRouter()
  const { hasAnswers } = useCheckIn()
  const leave = useLeaveCheckIn()

  return useCallback(() => {
    const discard = () => leave(() => router.navigate('/'))
    if (!hasAnswers || Platform.OS === 'web') return discard()
    Alert.alert('Discard this check-in?', 'Your photo and answers will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discard },
    ])
  }, [hasAnswers, leave, router])
}
