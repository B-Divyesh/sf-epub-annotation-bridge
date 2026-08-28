# EPUB Annotation Bridge handoff

## What was built

- A Tauri 2 desktop app with a Vite and TypeScript interface.
- A local annotation ledger for KOReader Lua, Kobo CSV or database records, and bridge JSON.
- EPUB spine reading, quote matching, chapter recovery, and portable EPUB CFI records.
- Markdown and JSON export in the free tier.
- Collision-safe JSON sidecar writing that never replaces an existing sidecar.
- Paid Calibre and mounted-reader folder scanning and live change watching.
- Sociobot checkout, returned-token capture, daily license verification, offline cached verdicts, and license restore.
- An isolated `/demo` with five public-domain highlights and separate `sessionStorage`.
- Real `/`, `/demo`, `/ledger`, `/download`, `/privacy`, `/terms`, and styled 404 routes.
- A monochrome broadsheet visual system, original generated hero art, and three app screenshot walkthrough frames.
- Responsive AVIF and WebP art with a JPEG fallback, PWA shell caching, metadata, sitemap, robots, security headers, and app icons.
- OS-aware GitHub release downloads plus checksum-verifying shell and PowerShell installers.
- A tag-driven GitHub Actions matrix for macOS arm64 and x64, Windows x64, and Linux x64 bundles.

## Run and deploy

```sh
npm ci
npm run dev
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

The exact static deploy command is `npm run build`. Deploy `dist/site`; its root contains `index.html`.

Use `npm run tauri dev` for the desktop shell. Push a `v*` tag to run the release matrix.

## Verification completed on 2026-08-28

- `npm test`: passed 4 Vitest unit tests and 16 Playwright tests.
- Browser coverage: desktop Chromium and a 390px mobile Chromium profile.
- Claim coverage: demo isolation, Markdown and JSON export, same-origin reading flow, offline reload and export, three import formats, EPUB quote matching, and license verification.
- Accessibility: axe reported 0 serious or critical issues on all routes in both browser profiles. Keyboard skip navigation, empty and error states, one h1, landmarks, titles, mobile overflow, and console errors are tested.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed 2 native tests for non-replacing sidecars and filesystem change events.
- `npm run build`: passed. Initial app JavaScript is 35.83 KB raw / 13.98 KB gzip. CSS is 14.01 KB raw / 4.04 KB gzip.
- Hero assets: 57 KB mobile AVIF, 62 KB mobile WebP, 214 KB desktop AVIF, 245 KB desktop WebP, and 279 KB JPEG fallback.
- `npm audit`: 0 vulnerabilities.
- Lighthouse mobile: performance 97, accessibility 100, best practices 100, SEO 100.
- Lighthouse lab metrics: FCP 0.90 s, LCP 2.33 s, total blocking time 145 ms, CLS 0.
- `sh -n public/install.sh`: passed.
- Release `v0.1.0`: published for macOS arm64/x64, Windows x64, and Linux x64 at https://github.com/B-Divyesh/sf-epub-annotation-bridge/releases/tag/v0.1.0.
- Release verification: downloaded the published DEB and matched it against `SHA256SUMS`; `latest.json` is valid and lists all five installers.

## Storage and network behavior

- Real ledger: `localStorage` key `epub-bridge:ledger:v1`.
- Demo ledger: `sessionStorage` key `demo:epub-bridge:ledger:v1`.
- License: `localStorage` key `sb_license:epub-annotation-bridge`; only the token is sent to Sociobot for verification.
- Download page: requests only public GitHub release metadata and caches it for one hour.
- No analytics, telemetry, third-party fonts, or runtime CDN scripts.

## Known gaps

- Builds are unsigned. macOS users must right-click and choose Open; Windows shows its unsigned-app warning.
- Generated CFIs are stable spine-and-text offsets for bridge round trips. They are not reader-vendor DOM range objects.
- Folder watching requires a mounted filesystem path. Reader protocols that do not expose a filesystem are outside v1.
- The app supports legal, unencrypted EPUBs only and does not bypass DRM.

## Needs operator action

1. Register `epub-annotation-bridge` with the Sociobot billing API at $19 and set its return URL to the deployed `/download` route.
2. Add signing when certificates are available. Expected macOS secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`. Expected Windows secrets: `WINDOWS_CERT_PFX` and `WINDOWS_CERT_PASSWORD`.
