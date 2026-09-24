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
Database schema and edge functions live in `/supabase`. To pull the latest schema locally:
```bash
npx supabase link --project-ref tjgrlbbozelcpyjvdbve
npx supabase db pull
```

## Repo Structure
```
/src        - application code (screens, components, lib)
/supabase   - database migrations, edge functions, config
/docs       - design docs, architecture decisions
/.github    - issue templates, PR template
```

## Design Docs
Link to Figma / design review slides / architecture doc here.

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for our git workflow and how to open a ticket.