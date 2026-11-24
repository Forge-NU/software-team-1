import { router, Stack } from 'expo-router'

import SpotSearch from '@/components/SpotSearch'
import { spotHref } from '@/navigation/SpotRoutes'

// F-11: Explore's search, in the Explore tab. The native header has the title and back button.
export default function SearchRoute() {
    return (
        <>
            <Stack.Screen options={{ title: 'Search' }} />
            {/* Replaces search with the spot, so back goes straight to Explore */}
            <SpotSearch variant="explore" onSelect={(spot) => router.replace(spotHref('', spot.locationId))} />
        </>
    )
}
