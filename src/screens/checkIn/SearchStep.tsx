import React from 'react'

import SpotSearch from '../../components/SpotSearch'
import type { SpotSummary } from '../../lib/checkIn'

interface SearchStepProps {
  onPick: (spot: SpotSummary) => void
}

// The Check in tab's first screen: no back or cancel, the native header shows "Check in"
export default function SearchStep({ onPick }: SearchStepProps) {
  return <SpotSearch variant="checkIn" onSelect={onPick} />
}
