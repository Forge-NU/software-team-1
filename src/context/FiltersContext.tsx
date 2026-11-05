import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { emptyFilters, Filters } from '../screens/FiltersScreen'

export interface ActiveChip {
  key: string
  label: string
}

interface FiltersContextValue {
  /** The filters currently applied to Explore (map and list). */
  filters: Filters
  /** One chip per selected option, for the "active filters" row. */
  activeChips: ActiveChip[]
  /** Replaces all filters, e.g. when "Show results" is tapped on the Filters screen. */
  applyFilters: (filters: Filters) => void
  /** Removes a single chip's filter. Keys match the ones FiltersScreen uses. */
  removeChip: (key: string) => void
  clearAll: () => void
}

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined)

const PRICE_LABELS: Record<number, string> = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

function freshFilters(): Filters {
  return { ...emptyFilters, locationTypes: [], amenities: [], priceRangeIds: [] }
}

export function getActiveChips(filters: Filters): ActiveChip[] {
  const chips: ActiveChip[] = []
  if (filters.atmosphere !== null) chips.push({ key: 'noise', label: filters.atmosphere })
  for (const type of filters.locationTypes) chips.push({ key: `location-${type}`, label: type })
  for (const amenity of filters.amenities) chips.push({ key: `amenity-${amenity}`, label: amenity })
  for (const id of filters.priceRangeIds) {
    chips.push({ key: `price-${id}`, label: PRICE_LABELS[id] ?? String(id) })
  }
  if (filters.accessible) chips.push({ key: 'accessible', label: 'Accessible' })
  return chips
}

function withoutChip(filters: Filters, key: string): Filters {
  if (key === 'noise') return { ...filters, atmosphere: null }
  if (key === 'accessible') return { ...filters, accessible: false }
  if (key.startsWith('location-')) {
    const value = key.slice('location-'.length)
    return { ...filters, locationTypes: filters.locationTypes.filter((t) => t !== value) }
  }
  if (key.startsWith('amenity-')) {
    const value = key.slice('amenity-'.length)
    return { ...filters, amenities: filters.amenities.filter((a) => a !== value) }
  }
  if (key.startsWith('price-')) {
    const id = Number(key.slice('price-'.length))
    return { ...filters, priceRangeIds: filters.priceRangeIds.filter((p) => p !== id) }
  }
  return filters
}

/**
 * Selected options that B-5 can't filter by yet. Explore shows a notice
 * so users know these aren't narrowing the results.
 */
export function getUnsupportedLabels(filters: Filters): string[] {
  const labels: string[] = []
  if (filters.atmosphere === 'Social / conversation OK') labels.push(filters.atmosphere)
  labels.push(...filters.amenities.filter((a) => a !== 'Outlets'))
  if (filters.accessible) labels.push('Accessible')
  return labels
}

/**
 * Wrap the app in this. Explore, the map (F-2), the list (F-3) and the
 * Filters screen all read the same filters from useFilters(), so they stay
 * in sync and stay applied while the app is open.
 */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(freshFilters)

  const applyFilters = useCallback((next: Filters) => setFilters(next), [])
  const removeChip = useCallback((key: string) => setFilters((prev) => withoutChip(prev, key)), [])
  const clearAll = useCallback(() => setFilters(freshFilters()), [])

  const value = useMemo(
    () => ({ filters, activeChips: getActiveChips(filters), applyFilters, removeChip, clearAll }),
    [filters, applyFilters, removeChip, clearAll],
  )

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}

export function useFilters() {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters must be used inside <FiltersProvider>')
  return ctx
}