
export const fontFamily = {
    regular: 'Afacad_400Regular',
    medium: 'Afacad_500Medium',
    semiBold: 'Afacad_600SemiBold',
    bold: 'Afacad_700Bold',
} as const;

export const typography = {
    display: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34 },
    title: { fontFamily: fontFamily.semiBold, fontSize: 24, lineHeight: 32 },
    header: { fontFamily: fontFamily.semiBold, fontSize: 22, lineHeight: 22 },
    heading: { fontFamily: fontFamily.semiBold, fontSize: 18, lineHeight: 22 },
    bodyStrong: { fontFamily: fontFamily.semiBold, fontSize: 16, lineHeight: 22 },
    body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 22 },
    bodySmall: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
    label: { fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 18 },
    button: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 14 },
    caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
    captionStrong: { fontFamily: fontFamily.semiBold, fontSize: 13, lineHeight: 18 },
    tag: { fontFamily: fontFamily.semiBold, fontSize: 12, lineHeight: 12 },
    small: { fontFamily: fontFamily.regular, fontSize: 11, lineHeight: 16 },
} as const;
