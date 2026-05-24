# Release Readiness

## Local Release Checks

Run the full local gate before tagging or handing off a build:

```sh
npm run quality
```

This runs ESLint, Prettier check, Vitest, TypeScript build, and Vite production build.

## Web MVP Build

```sh
npm run build
```

The production web output is written to `dist/`. The app is a local-only browser MVP with no backend URL, no auth provider, and no committed secrets.

## Configuration

- App name and stage live in `src/core/config/appConfig.ts`.
- Runtime mode is read from Vite environment values only.
- Do not commit `.env.local`, signing keys, store credentials, certificates, analytics keys, or real user data.

## Privacy and Data Safety

The MVP stores private cookbook data in browser storage for the current browser profile:

- recipes;
- cookbook/category organization;
- meal plan loops;
- local photo references only, not app-managed photo blobs.

No analytics, tracking, account credentials, payments, location, health data, or public publishing data are collected.

## Store and Mobile Conversion Notes

Native iOS/Android signing, app-store metadata, app icon, splash screen, and store privacy forms are deferred until the mobile conversion phase. Those steps require platform accounts and signing materials that must stay out of the repository.
