import { Image, View } from 'react-native';

/** The Spotted logo on its tile, from the Figma "Sign Up/In" frame. Exported from Figma: assets/logo.png */
export function BrandMark() {
  return (
    <View
      className="h-[72px] w-[72px] items-center justify-center rounded-xxl bg-primaryLight"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Spotted logo"
    >
      <Image source={require('../../assets/logo.png')} style={{ width: 51, height: 54 }} resizeMode="contain" />
    </View>
  );
}
