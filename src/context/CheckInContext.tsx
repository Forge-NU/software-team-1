import React, { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react'
import {
  CheckInPhoto,
  compressPhoto,
  Crowding,
  Noise,
  PostedCheckIn,
  SpotSummary,
  submitCheckIn,
} from '../lib/checkIn'

/**
 * Answers for the check-in in progress: search → photo → details → done.
 *
 * Each step is its own screen in the Check in tab's stack (app/(tabs)/check-in), so the
 * answers live here instead. Going back a step, retaking the photo, switching tabs, or a
 * failed upload never loses what the user entered. Only reset() clears them.
 */
interface CheckInContextValue {
  spot: SpotSummary | null
  photo: CheckInPhoto | null
  crowding: Crowding | null
  noise: Noise | null
  outlets: boolean
  note: string
  /** True once the user has entered anything worth confirming before discarding. */
  hasAnswers: boolean

  submitting: boolean
  /** Upload progress, 0 to 1. */
  progress: number
  submitError: string | null
  /** Set once the check-in is posted. */
  posted: PostedCheckIn | null

  /** Picks the spot to check in at. Keeps any answers already entered. */
  chooseSpot: (spot: SpotSummary) => void
  /** Starts a fresh check-in at this spot, e.g. when opened from Spot Detail. */
  startAt: (spot: SpotSummary) => void
  setPhoto: (photo: CheckInPhoto) => void
  setCrowding: (crowding: Crowding) => void
  setNoise: (noise: Noise) => void
  setOutlets: (outlets: boolean) => void
  setNote: (note: string) => void
  /** Posts the check-in. Resolves true when it was posted. */
  submit: () => Promise<boolean>
  /** Clears everything, ready for the next check-in. */
  reset: () => void
}

const CheckInContext = createContext<CheckInContextValue | undefined>(undefined)

export function CheckInProvider({ children }: { children: ReactNode }) {
  const [spot, setSpot] = useState<SpotSummary | null>(null)
  const [photo, setPhotoState] = useState<CheckInPhoto | null>(null)
  const [crowding, setCrowding] = useState<Crowding | null>(null)
  const [noise, setNoise] = useState<Noise | null>(null)
  const [outlets, setOutlets] = useState(false)
  const [note, setNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [posted, setPosted] = useState<PostedCheckIn | null>(null)

  // Compress once per photo, so a retry doesn't redo it.
  const compressed = useRef<{ source: string; photo: CheckInPhoto } | null>(null)

  const reset = useCallback(() => {
    setSpot(null)
    setPhotoState(null)
    setCrowding(null)
    setNoise(null)
    setOutlets(false)
    setNote('')
    setSubmitting(false)
    setProgress(0)
    setSubmitError(null)
    setPosted(null)
    compressed.current = null
  }, [])

  const startAt = useCallback(
    (next: SpotSummary) => {
      reset()
      setSpot(next)
    },
    [reset]
  )

  const setPhoto = useCallback((next: CheckInPhoto) => {
    setPhotoState(next)
    setSubmitError(null)
  }, [])

  const submit = useCallback(async () => {
    if (!spot || !photo || !crowding || !noise || submitting) return false
    setSubmitting(true)
    setSubmitError(null)
    setProgress(0)
    try {
      if (compressed.current?.source !== photo.uri) {
        compressed.current = { source: photo.uri, photo: await compressPhoto(photo) }
      }
      const result = await submitCheckIn(
        {
          location: spot,
          photo: compressed.current.photo,
          crowding,
          noise,
          outlets,
          note: note.trim(),
          appliesAt: new Date().toISOString(),
        },
        setProgress
      )
      setPosted(result)
      return true
    } catch (e: any) {
      // Everything the user entered stays in state, so they can just retry.
      setSubmitError(e?.message ?? 'Something went wrong.')
      return false
    } finally {
      setSubmitting(false)
    }
  }, [spot, photo, crowding, noise, outlets, note, submitting])

  const value = useMemo<CheckInContextValue>(
    () => ({
      spot,
      photo,
      crowding,
      noise,
      outlets,
      note,
      hasAnswers: photo !== null || crowding !== null || noise !== null || note.length > 0,
      submitting,
      progress,
      submitError,
      posted,
      chooseSpot: setSpot,
      startAt,
      setPhoto,
      setCrowding,
      setNoise,
      setOutlets,
      setNote,
      submit,
      reset,
    }),
    [spot, photo, crowding, noise, outlets, note, submitting, progress, submitError, posted, startAt, setPhoto, submit, reset]
  )

  return <CheckInContext.Provider value={value}>{children}</CheckInContext.Provider>
}

export function useCheckIn() {
  const value = useContext(CheckInContext)
  if (!value) throw new Error('useCheckIn must be used inside <CheckInProvider>')
  return value
}
