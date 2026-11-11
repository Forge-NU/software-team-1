
import React from 'react'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View } from 'react-native'

import SpotSearch from '@/components/SpotSearch'
import { colors } from '@/theme'

export default function SearchRoute() {
    const insets = useSafeAreaInsets()

    return (
        <View
            style={{
                flex: 1,
                paddingTop: insets.top,
                backgroundColor: colors.surface,
            }}
        >
            <SpotSearch
                variant="explore"
                onCancel={() => router.back()}
                onSelect={(spot) => {
                    router.replace({
                        pathname: '/spot/[id]',
                        params: {
                            id: String(spot.locationId),
                        },
                    })
                }}
            />
        </View>
    )
}
