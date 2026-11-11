import React, { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { Feather } from '@expo/vector-icons'
import type { CheckInPhoto } from '../../lib/checkIn'
import FlowHeader from '../../components/FlowHeader'
import Button from '../../components/Button'
import { colors, layout, radius, spacing, typography } from '../../theme'

interface PhotoStepProps {
  spotName: string
  onPhoto: (photo: CheckInPhoto) => void
  onBack: () => void
  onCancel: () => void
}

export default function PhotoStep({ spotName, onPhoto, onBack, onCancel }: PhotoStepProps) {
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [flash, setFlash] = useState<'off' | 'on'>('off')
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return
    setCapturing(true)
    setError(null)
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8 })
      if (pic) onPhoto({ uri: pic.uri, width: pic.width, height: pic.height })
    } catch {
      setError("Couldn't take the photo. Try again or choose one from your library.")
    } finally {
      setCapturing(false)
    }
  }

  const pickFromLibrary = async () => {
    setError(null)
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0]
      onPhoto({ uri: a.uri, width: a.width, height: a.height })
    }
  }

  const cameraReady = permission?.granted

  return (
    <View style={styles.screen}>
      <FlowHeader title="Check in" onBack={onBack} onCancel={onCancel} />

      <View style={styles.body}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.step}>STEP 1 OF 2 · PHOTO</Text>
        <Text style={styles.spotName}>{spotName}</Text>
        <Text style={styles.hint}>Show the room and open seats. Avoid people’s faces.</Text>

        <View style={styles.viewfinder}>
          {cameraReady ? (
            <>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />
              <Text style={[styles.overlayLabel, styles.overlayTop]}>Room view</Text>
              <Pressable
                onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
                style={styles.overlayBottom}
                hitSlop={10}
                accessibilityRole="button"
              >
                <Text style={styles.overlayLabel}>Flash: {flash === 'off' ? 'Off' : 'On'}</Text>
              </Pressable>
            </>
          ) : permission === null ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (
            <View style={styles.permission}>
              <Feather name="camera" size={28} color={colors.primary} />
              <Text style={styles.permissionText}>
                Spotted needs your camera to take a check-in photo. You can also choose one from your library.
              </Text>
              <Button label="Allow camera" onPress={requestPermission} />
            </View>
          )}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.controls}>
        <Pressable
          style={styles.sideButton}
          onPress={pickFromLibrary}
          accessibilityRole="button"
          accessibilityLabel="Choose from library"
        >
          <Feather name="image" size={24} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          style={[styles.shutter, (!cameraReady || capturing) && styles.disabled]}
          onPress={takePhoto}
          disabled={!cameraReady || capturing}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
        >
          <View style={styles.shutterInner}>
            {capturing && <ActivityIndicator color={colors.primaryDark} />}
          </View>
        </Pressable>

        <Pressable
          style={[styles.sideButton, !cameraReady && styles.disabled]}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          disabled={!cameraReady}
          accessibilityRole="button"
          accessibilityLabel="Flip camera"
        >
          <Feather name="refresh-cw" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
      <Text style={styles.caption}>Tap the shutter to take your check-in photo.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: layout.screenPaddingHorizontal },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.primary },
  dotActive: { backgroundColor: colors.primary },
  step: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md },
  spotName: { ...typography.display, color: colors.textPrimary, marginTop: spacing.xs },
  hint: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },

  viewfinder: {
    marginTop: spacing.md,
    aspectRatio: 1.1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLabel: { ...typography.caption, color: colors.surface, textShadowColor: colors.shadow, textShadowRadius: 4 },
  overlayTop: { position: 'absolute', top: spacing.sm },
  overlayBottom: { position: 'absolute', bottom: spacing.sm },
  permission: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  permissionText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingHorizontal + spacing.xs,
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
})
