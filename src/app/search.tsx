import { router } from 'expo-router'

import SpotSearch from '@/components/SpotSearch'

// F-11: Explore's search. The native header (app/_layout.tsx) has the title and back button.
export default function SearchRoute() {
    return (
        <SpotSearch
            variant="explore"
            onSelect={(spot) => {
                router.replace({
                    pathname: '/spot/[id]',
                    params: {
                        id: String(spot.locationId),
                    },
                })
            }}
        />
    )
}
