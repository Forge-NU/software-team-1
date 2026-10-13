// Taken from the hi-fi Figma frames (approximate hex values from screenshots).
export const colors = {
  bg: '#F4F6FA', // screen background
  card: '#FFFFFF',
  border: '#E3E8F0',
  text: '#111827', // headings, names
  body: '#374151', // card titles
  slate: '#4B5563', // row labels
  muted: '#6B7280', // secondary text
  brand: '#8FB8E8', // "Spotted" wordmark, chevrons
  primary: '#3B73D9', // buttons, links
  avatarBg: '#EAF2FB',
  innerCard: '#F6F9FD',
  danger: '#C62828',
}

// TODO: set this to the Figma font once it's loaded with expo-font
// (select any text in Figma; the font name is in the right panel).
export const fontFamily: string | undefined = undefined

export const cardShadow = {
  shadowColor: '#1F2937',
  shadowOpacity: 0.05,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
}
