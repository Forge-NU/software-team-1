import React, { useRef, useState } from 'react'
import { Alert, Platform } from 'react-native'
import {
  CheckInPhoto,
  compressPhoto,
  Crowding,
  Noise,
  PostedCheckIn,
  SpotSummary,
  submitCheckIn,
} from '../../lib/checkIn'
import { useProfile } from '../../context/ProfileContext'
import SearchStep from './SearchStep'
import PhotoStep from './PhotoStep'
import DetailsStep from './DetailsStep'
import ConfirmationStep from './ConfirmationStep'

/**
 * The whole check-in flow: search → photo → details → submit → thanks.
 *
 * All answers live here in the parent, so going back a step, retaking the
 * photo, or a failed upload never loses what the user entered.
 * Navigation out of the flow is passed in as callbacks (same as ProfileScreen).
 */
export interface CheckInFlowProps {
  /** Pass this when opening from Spot Detail to skip the search step. */
  initialSpot?: SpotSummary
  onCancel: () => void
  onViewSpot: (locationId: number) => void
  onBackToExplore: () => void
}

type Step = 'search' | 'photo' | 'details' | 'done'

export default function CheckInFlow({ initialSpot, onCancel, onViewSpot, onBackToExplore }: CheckInFlowProps) {
  const { profile } = useProfile()

  const [step, setStep] = useState<Step>(initialSpot ? 'photo' : 'search')
  const [spot, setSpot] = useState<SpotSummary | null>(initialSpot ?? null)
  const [photo, setPhoto] = useState<CheckInPhoto | null>(null)
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

  const hasAnswers = photo !== null || crowding !== null || noise !== null || note.length > 0

  const confirmCancel = () => {
    if (!hasAnswers || Platform.OS === 'web') return onCancel()
    Alert.alert('Discard this check-in?', 'Your photo and answers will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onCancel },
    ])
  }

  const handlePhoto = (p: CheckInPhoto) => {
    setPhoto(p)
    setSubmitError(null)
    setStep('details')
  }

  const submit = async () => {
    if (!spot || !photo || !crowding || !noise || submitting) return
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
      setStep('done')
    } catch (e: any) {
      // Everything the user entered stays in state, so they can just retry.
      setSubmitError(e?.message ?? 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'search' || !spot) {
    return (
      <SearchStep
        onPick={(s) => {
          setSpot(s)
          setStep(photo ? 'details' : 'photo')
        }}
        onCancel={confirmCancel}
      />
    )
  }

  if (step === 'photo' || !photo) {
    return (
      <PhotoStep
        spotName={spot.name}
        onPhoto={handlePhoto}
        onBack={() => (initialSpot ? confirmCancel() : setStep('search'))}
        onCancel={confirmCancel}
      />
    )
  }

  if (step === 'done' && posted) {
    return (
      <ConfirmationStep
        posted={posted}
        displayName={profile?.displayName ?? null}
        onViewSpot={() => onViewSpot(posted.location.locationId)}
        onBackToExplore={onBackToExplore}
      />
    )
  }

  return (
    <DetailsStep
      spotName={spot.name}
      photo={photo}
      crowding={crowding}
      noise={noise}
      outlets={outlets}
      note={note}
      onCrowding={setCrowding}
      onNoise={setNoise}
      onOutlets={setOutlets}
      onNote={setNote}
      onRetake={() => setStep('photo')}
      onSubmit={submit}
      onBack={() => setStep('photo')}
      onCancel={confirmCancel}
      submitting={submitting}
      progress={progress}
      submitError={submitError}
    />
  )
}
