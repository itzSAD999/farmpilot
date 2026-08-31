# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-30

### Added
- **PWA / Installable**: App can be installed to Android home screen via a custom install prompt (shown once, dismissible). Service worker precaches the app shell for instant offline loading.
- **IndexedDB Offline Storage**: Three object stores (cache, queue, meta) with typed get/set/delete/list. Gracefully degrades to online-only if IndexedDB is unavailable (private browsing).
- **Offline Write Queue**: Writes are queued in IndexedDB with a `client_id` UUID stamped into the payload for idempotency. On reconnect, queued writes flush automatically with exponential backoff. Duplicate 23505 errors (interrupted flush) are silently resolved. Writes that fail 5 times are surfaced in a retryable failed list — nothing is ever silently dropped.
- **Offline Banner**: Persistent amber banner when offline reassuring the farmer their data is safe. Shows pending item count, a syncing animation during flush, and a failed-entries panel with per-item retry.
- **Unsynced Markers**: Cost list items that have not yet synced to the server show a "Not yet synced" badge.
- **Offline-Aware Estimate Button**: Disabled when offline with a clear inline reason: "You need internet to generate an estimate."
- **Online/Offline Hook**: `useOnline` tracks `navigator.onLine` + events, debounced to handle connectivity flapping.

## [1.0.0] - 2026-08-30

### Added
- **Authentication**: Fully functional sign-up and sign-in using Supabase, supporting both email and phone number login.
- **Farm Setup**: Multi-step wizard to set up farm details including location (region/district), farm size, and main crops.
- **Dashboard**: A comprehensive overview showing total recorded spend, total estimated cost, and a list of active and closed seasons.
- **Season Management**: Create new seasons by selecting a crop, year, season window, and area planted.
- **Cost Tracking**: Add costs dynamically with options for known totals or unit-based rates. Support for various categories (seeds, fertiliser, agrochemicals, labour, land prep, transport, storage, other).
- **Intelligent Estimates**: Compare actual expenditures against benchmarks dynamically scaled to farm size and crop type.
- **Estimation Reports**: Breakdown of costs in a visually distinct layout highlighting areas of potential savings (flagged categories).
- **Close Season**: Ability to log harvest quantity and revenue to close out a season, converting future estimates for this crop to historical averages.
- **Accessibility & Mobile-First**: 44x44px tap targets, distinct labels, accessible aria tags, focus rings, and high contrast typography (4.5:1 ratio) suitable for one-handed outdoor usage.

### Fixed
- Fixed an issue with global fetch interceptors causing background authentication refresh to fail.
- Optimized inputs for greyscale visibility.
- Prevented database errors from leaking to UI by implementing consistent error, empty, and loading states across all 8 screens.
- Avoided floating point arithmetic on currency by fully utilizing integer pesewas in logic and only converting for display purposes.
