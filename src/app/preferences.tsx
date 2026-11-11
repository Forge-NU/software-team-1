import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { FormMessage } from '@/components/FormMessage';
import TopBar from '@/components/TopBar';
import { Button, Screen, Text } from '@/components/ui';
import { ATMOSPHERE_NOISE_LEVEL, type AmenityId as Amenity } from '@/constants/lookups';
import { getPreferences, updatePreferences } from '@/lib/profile';
import { colors } from '@/theme';

type Atmosphere = keyof typeof ATMOSPHERE_NOISE_LEVEL;

const ATMOSPHERE_OPTIONS: { value: Atmosphere; label: string }[] = [
  { value: 'quiet', label: 'Quiet — focused solo study' },
  { value: 'social', label: 'Social — room to collaborate' },
];

const AMENITY_OPTIONS: { value: Amenity; label: string }[] = [
  { value: 'outlets', label: 'Outlets' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'whiteboards', label: 'Whiteboards' },
  { value: 'food_drinks', label: 'Food and drinks nearby' },
];

/** The atmosphere option for a saved noise level, or null if it isn't one of them */
function atmosphereFor(noiseLevel: number | null): Atmosphere | null {
  const match = ATMOSPHERE_OPTIONS.find((option) => ATMOSPHERE_NOISE_LEVEL[option.value] === noiseLevel);
  return match?.value ?? null;
}

/** Figma "Preferences" frame (Hi-Fis). Opened once after sign up, and later from Settings. */
export default function PreferencesScreen() {
  const router = useRouter();
  const [atmosphere, setAtmosphere] = useState<Atmosphere | null>(null);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Pre-fill what's already saved, so opening this from Settings doesn't wipe it on Save
  useEffect(() => {
    let active = true;
    getPreferences()
      .then((saved) => {
        if (!active) return;
        setAtmosphere(atmosphereFor(saved.preferredNoise));
        setAmenities(saved.preferredAmenities);
      })
      .catch(() => {}) // Nothing to show; start blank
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const toggleAmenity = (value: Amenity) =>
    setAmenities((current) => (current.includes(value) ? current.filter((a) => a !== value) : [...current, value]));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // Leaves the notification setting alone; that lives in Settings
      await updatePreferences({
        preferredNoise: atmosphere ? ATMOSPHERE_NOISE_LEVEL[atmosphere] : null,
        preferredAmenities: amenities,
      });
      done();
    } catch {
      setError('Your preferences weren’t saved. Try again, or skip for now.');
    } finally {
      setSaving(false);
    }
  };

  const skip = (
    <Pressable
      onPress={done}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Skip"
      className="rounded-pill bg-primaryLight px-sm py-xs active:opacity-80"
    >
      <Text variant="label" color="textOnPrimaryLight">
        Skip
      </Text>
    </Pressable>
  );

  return (
    <Screen
      header={<TopBar title="Study preferences" right={skip} />}
      scroll
      padBottom
      contentClassName="gap-md pb-xl"
    >
      <View className="-mx-gutter gap-xs bg-primaryLight px-gutter py-xl">
        <Text variant="title" accessibilityRole="header">
          What’s your study style?
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          Optional. We’ll use this to rank suggestions, not hide other spots.
        </Text>
      </View>

      <Section title="Preferred atmosphere">
        {ATMOSPHERE_OPTIONS.map((option) => (
          <Option
            key={option.value}
            label={option.label}
            kind="radio"
            selected={atmosphere === option.value}
            // Tapping the selected one again clears it, since this is optional
            onPress={() => setAtmosphere(atmosphere === option.value ? null : option.value)}
          />
        ))}
      </Section>

      <Section title="Amenities that matter">
        {AMENITY_OPTIONS.map((option) => (
          <Option
            key={option.value}
            label={option.label}
            kind="checkbox"
            selected={amenities.includes(option.value)}
            onPress={() => toggleAmenity(option.value)}
          />
        ))}
      </Section>

      <View className="mt-auto gap-sm pt-md">
        <FormMessage message={error} tone="error" />
        <Button label="Save & explore" onPress={save} loading={saving} disabled={!loaded} />
        <Button label="Skip for now" variant="outline" onPress={done} />
        <Text variant="caption" color="textSecondary" className="text-center">
          Change these any time in your profile.
        </Text>
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-sm">
      <Text variant="bodyStrong">{title}</Text>
      <View className="gap-sm rounded-xl border border-border bg-surface p-md">{children}</View>
    </View>
  );
}

function Option({
  label,
  kind,
  selected,
  onPress,
}: {
  label: string;
  kind: 'radio' | 'checkbox';
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-[52px] flex-row items-center gap-sm rounded-lg border px-md active:opacity-80 ${
        selected ? 'border-primaryDark bg-primaryLight' : 'border-border bg-surface'
      }`}
    >
      {kind === 'radio' ? (
        <View
          className={`h-5 w-5 items-center justify-center rounded-pill border ${
            selected ? 'border-primaryDark' : 'border-textPlaceholder'
          }`}
        >
          {selected && <View className="h-2.5 w-2.5 rounded-pill bg-primaryDark" />}
        </View>
      ) : (
        <View
          className={`h-5 w-5 items-center justify-center rounded-sm border ${
            selected ? 'border-primaryDark bg-primaryDark' : 'border-textPlaceholder'
          }`}
        >
          {selected && <Feather name="check" size={14} color={colors.textOnPrimary} />}
        </View>
      )}
      <Text variant="body">{label}</Text>
    </Pressable>
  );
}
