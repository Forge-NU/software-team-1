import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { FiltersProvider, useFilters } from './src/context/FiltersContext';
import { NU_CAMPUS } from './src/lib/exploreSource';
import ExploreScreen from './src/screens/ExploreScreen';
import FiltersScreen from './src/screens/FiltersScreen';

// this is temporary: switches between Explore and Filters until the F-1 app shell
// is merged. Replace this with real navigation then; keep the
// FiltersProvider wrapping the app.
function TemporaryNavigator() {
    const [screen, setScreen] = useState<'explore' | 'filters'>('explore');
    const { filters, applyFilters } = useFilters();

    if (screen === 'filters') {
        return (
            <FiltersScreen
                initialFilters={filters}
                latitude={NU_CAMPUS.latitude}
                longitude={NU_CAMPUS.longitude}
                onApply={(next) => {
                    applyFilters(next);
                    setScreen('explore');
                }}
            />
        );
    }

    return <ExploreScreen onOpenFilters={() => setScreen('filters')} />;
}

export default function App() {
    return (
        <FiltersProvider>
            <TemporaryNavigator />
            <StatusBar style="auto" />
        </FiltersProvider>
    );
}