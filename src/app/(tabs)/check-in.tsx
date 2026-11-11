import { useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import CheckInFlow from '@/screens/checkIn/CheckInFlow'
import type { SpotSummary } from '@/lib/checkIn'
import { colors } from '@/theme'

// Open a check-in for a specific spot (skipping search) with:
//   router.push({ pathname: '/check-in', params: { locationId: String(id), name } })
export default function CheckInRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ locationId?: string; name?: string }>()

  const initialSpot: SpotSummary | undefined = params.locationId
    ? { locationId: Number(params.locationId), name: params.name ?? 'This spot', seatingId: null }
    : undefined

  // Bumping the key starts a fresh check-in. Only done when a check-in ends,
  // so switching tabs mid-check-in doesn't lose anything.
  const [run, setRun] = useState(0)
  const reset = () => setRun((r) => r + 1)

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.surface }}>
      <CheckInFlow
        key={`${run}-${params.locationId ?? 'search'}`}
        initialSpot={initialSpot}
        onCancel={() => {
          reset()
          router.navigate('/')
        }}
        onViewSpot={(locationId) => {
          reset()
          router.push({ pathname: '/spot/[id]', params: { id: String(locationId) } })
        }}
        onBackToExplore={() => {
          reset()
          router.navigate('/')
        }}
      />
    </View>
  )
}
