# Spotted

Spotted is a mobile app that helps students in Boston find, rate, and choose the best spot to study based on real-time crowdedness, noise, and amenities.

## Team
- **Project Lead:** Angel El Moucary
- **Members:** Grace Chau, Audrey Thornal, Hari Mohanraj, Paarth Trehan, Sohum Balsara, Logan Gill, Sor Liu, Manan Gangwani
- **Semester:** Fall 2026

## Why This Exists
Students constantly waste time wandering between the library, cafés, and random buildings looking for a spot that's quiet enough, not packed, and has an outlet free. Existing tools like Google Maps show a location exists but not whether it's actually usable *right now*. Spotted solves this by combining baseline location data with real-time, student-submitted updates on crowdedness, noise, and amenities.

## Tech Stack
- Frontend: React Native (Expo), TypeScript
- Backend: Supabase
- Database: Postgres (SQL for schema)
- Infra/Deploy: Expo EAS (app builds/distribution) + Supabase Cloud (hosted backend) + GitHub Actions (CI/CD)

## Getting Started

### Prerequisites
- Node.js (v20+)
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) — for testing on a real device
- Supabase project access (ask Angel)

### Setup
```bash
# clone
git clone https://github.com/Forge-NU/software-team-1.git
cd software-team-1

# install dependencies
npm install

# set up environment variables
cp .env.example .env
```
Then get the Supabase URL and anon key from Slack (or [Project Settings → API](https://supabase.com/dashboard/project/tjgrlbbozelcpyjvdbve/settings/api) if you have dashboard access) and paste them into your `.env`.

```bash
# run locally
npx expo start
```
Scan the QR code with Expo Go, or press `i` / `a` for iOS/Android simulator.

## Backend (Supabase)
Database schema, scripts and tests live in `/supabase`. To pull the latest schema locally:
```bash
npx supabase link --project-ref tjgrlbbozelcpyjvdbve
npx supabase db pull
```

To apply the schema in `supabase/migrations` to the linked project:
```bash
npx supabase db push
```

### Location data
Locations are imported from [OpenStreetMap](https://www.openstreetmap.org) with a script (see [supabase/README.md](supabase/README.md#importing-places-from-openstreetmap)):

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run import:osm
```

OSM data is © OpenStreetMap contributors under the ODbL, so the app must show that credit wherever it displays these locations.

Use the helpers in `src/lib/places.ts` from the app: `getLocation`, `listLocations`, `getNearbyLocations`, `updateLocation`, `deleteLocation`. Editing locations requires a `users` row with `user_type = 'admin'` (set it from the Supabase dashboard).

## Frontend

### Routes (`src/app`, Expo Router)
Each file in `src/app` is a screen; its path is the URL. Folders in parentheses are *route groups*: they share a layout but don't appear in the URL, so `src/app/(tabs)/feed.tsx` is `/feed`.

- `(tabs)/` - the tab bar (Explore, Feed, Saved, Check in, Profile). Tabs owned by later tickets are placeholders; replace the file's contents when you build yours.
- `spot/[id].tsx` - spot detail. Open it with `router.push({ pathname: '/spot/[id]', params: { id: String(locationId) } })`.
- `settings.tsx`, `preferences.tsx` - pushed on top of the tabs.

Keep route files thin: build the screen in `src/screens/` with navigation passed in as callbacks (see `(tabs)/profile.tsx`), so screens don't depend on the router.

### Styling
All colors, fonts, sizes, spacing and radii live in `src/theme`, which matches the Figma Style Guide. Never hardcode a hex value or font name; if you need a new one, add it to `src/theme` first.

- **Text:** use `<Text variant="heading" color="textSecondary">` from `@/components/ui`. It applies the Afacad font and the type scale for you.
- **Layout:** NativeWind classes are generated from the same theme: `bg-primaryDark`, `text-textSecondary`, `border-border`, `p-md`, `gap-lg`, `px-gutter`, `rounded-xl`. `StyleSheet` with `import { colors, spacing } from '../theme'` works too and uses the same values.
- **Shared components:** `Button`, `TextField`, `Screen`, `Text` from `@/components/ui`, and `TopBar` from `@/components/TopBar`. `TopBar` pads the notch itself, so don't wrap it in a `SafeAreaView`.

## Repo Structure
```
/src        - application code (screens, components, lib)
/supabase   - database migrations, scripts, tests, config
/docs       - design docs, architecture decisions
/.github    - issue templates, PR template
```

## Design Docs
[Figma](https://www.figma.com/design/yX0wiDHzvE7jNMMob78Sfd/Spotted): Hi-Fis for screens, Style Guide and Components for tokens.

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for our git workflow and how to open a ticket.