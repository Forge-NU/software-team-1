
import React from 'react'

import SpotSearch from '../../components/SpotSearch'
import type { SpotSummary } from '../../lib/checkIn'

interface SearchStepProps {
  onPick: (spot: SpotSummary) => void
  onCancel: () => void
}

export default function SearchStep({
  onPick,
  onCancel,
}: SearchStepProps) {
  return (
    <SpotSearch
      variant="checkIn"
      onSelect={onPick}
      onCancel={onCancel}
    />
  )
}
