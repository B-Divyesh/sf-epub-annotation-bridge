# EPUB Annotation Bridge handoff

## Independent verification 2 — 2026-09-06

**Verdict: FAIL** — 4 findings (3 medium, 1 low) and 3 untested public claims.

The core product, live demo, prior functional repairs, clean build, all 13 declared commands, and the published Linux consumer artifact passed. Acceptance is blocked by four remaining issues:

1. At 1366×768 the primary sample action begins below the first screen; the default 1280×820 desktop window clips it.
2. The download page maps Android to a Linux AppImage and iPhone to a macOS DMG. Its public platform-detection claim has no independent platform-matrix test.
3. The installer claim says macOS and Linux accept an AppImage, but the test covers Linux only. The public Windows PowerShell installer path also has no tagged outcome test.
4. Decorative phrases such as “Issue 01,” “The margin rule,” and “Loose leaf / 404” violate the required no-metaphor, no-invented-lore copy contract.

Full evidence and exact dispositions are in `.factory/verification-2.md`. Product code was not changed during this verification.

## Status on 2026-09-06

This repair restores the reader’s job: keep highlights and notes portable when moving legal EPUBs between Calibre, KOReader, and Kobo.

- Desktop implementation: `dc0838662343d18ee842134aaad47ea7f8e000ca` (`v0.1.2`).
- Static-site routing implementation: `e7f0649f26d5d147955f43d1d5de3671945f2d82`, deployed to `https://epub-annotation-bridge.sociobot.in`.
- Previous verification documentation: `07f9331586a317851dcb790bee4fcbf0c3cc0158`.
- Repair verification documentation: `009a093e8f68b52411d12b39c36ceddda0f0ad32`; this report-only commit does not change the deployed product.

## What changed

- Removed the $19 checkout link while Sociobot billing registration is unavailable. The price and paid folder tools remain described, but visitors now see an honest registration notice instead of a known HTTP 404. Public offer metadata is at `/work/.evidence/billing-offer.json` for the billing-registration operator.
- Fixed ledger filtering by hiding nonmatching rows, announcing the matching count, and explaining an empty result.
- Made the narrow layout work at 200% text size. Keyboard focus now reaches the file chooser through its visible label, and navigation, demo, reset, and footer controls meet the 44px touch-target floor.
- Updated `fflate` to 0.8.3 and reject malformed EPUB archives with a recovery path.
- Replaced partial native claim checks with outcome checks for collision-safe sidecars, a Calibre plus Kobo watcher refresh, and a Kobo SQLite import. The license claim now tests the unlocked Tauri control rather than a browser-only surrogate.
- Added outcome claims for Kobo database import, POSIX installer SHA-256 refusal, one-hour release cache/fallback, and the unavailable checkout state.
- Documented the exact Debian/Ubuntu desktop prerequisites. A clean checkout can now run the stated native command after installing them.
- Replaced the SPA fallback with explicit app-route rewrites and a custom `404.html` response override. `/demo`, `/privacy`, `/download`, and `/terms` return 200; unknown routes return the designed page with HTTP 404.
- Made the POSIX installer test skip only on Windows runners, where `install.ps1` is the supported installer. The POSIX outcome is still exercised in Linux verification.

## Verification

Clean checkout verification used a new clone of `main`, then ran:

```sh
npm ci
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Before the Rust command, the documented prerequisites were installed:

```sh
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

Results:

- `npm test`: 5 Vitest tests and 24 Playwright tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 3 native outcome tests passed.
- All 13 commands declared in `.factory/claims.json` passed from that clean checkout.
- `npm run build`: passed. Entry JavaScript is 36.50 KB raw / 14.27 KB gzip; CSS is 15.28 KB raw / 4.27 KB gzip.
- `npm audit --omit=dev --json`: zero vulnerabilities.
- `sh -n public/install.sh`: passed.
- GitHub Actions release `v0.1.2`: verify, Linux AppImage/DEB, Windows MSI, macOS x64 DMG, and macOS arm64 DMG jobs all passed. The published `latest.json` names all five installers.
- Consumer artifact: the published Linux DEB matched `SHA256SUMS`, extracted in a clean temporary package tree, and stayed running under a virtual display. The live download page detected Linux and linked to its real v0.1.2 AppImage with no console error.
- Live `verify-url.sh`: 200, no browser console errors, `lang=en`, title, one h1, main landmark, and no missing image alt text.
- Live Playwright axe scan: zero serious or critical findings on `/`, `/demo`, `/download`, `/privacy`, `/terms`, and an unknown route.
- Live Lighthouse: performance 99, accessibility 100, best practices 100, SEO 100.
- Fresh desktop and 390px-phone browser contexts each found, before scrolling: job “Move EPUB notes between readers”; audience “readers who move legal EPUBs between Calibre, KOReader, and Kobo”; first action “Try it with sample data”. Each sample loaded five notes, kept its persistent demo label after reset, and did not change a real-ledger marker.
- Live route checks: `/`, `/demo`, `/privacy`, `/download`, and `/terms` returned 200. `/not-a-real-page` returned the product 404 page with status 404.

Evidence is in `/work/.evidence/epub-annotation-bridge-repair-1-live`, including desktop and phone screenshots and the Lighthouse JSON report. The catalog description was copied to `/work/.evidence/catalog-description.txt`.

## Finding disposition

| Previous finding | Disposition |
| --- | --- |
| V1-01 checkout returned 404 | User-facing failure fixed by removing the broken link. Billing registration is still an external dependency; see below. |
| V1-02 filtering | Fixed and browser-regressed. |
| V1-03 200% mobile overflow | Fixed and tested at 390px with 32px root text. |
| V1-04 file chooser focus | Fixed and keyboard-regressed. |
| V1-05 small touch targets | Fixed and measured in browser tests. |
| V1-06 vulnerable `fflate` | Fixed at 0.8.3; production audit is clean. |
| V1-07 incomplete outcomes | Fixed with full native/desktop outcome assertions. |
| V1-08 missing native prerequisites | Fixed in README and reproduced from a clean checkout. |
| V1-09 HTTP 404 response | Fixed live; unknown pages return the designed 404 with status 404. |
| V1-10 unlisted claims | Fixed: public Kobo, installer, release fallback, and checkout-registration claims are declared and outcome-tested. |

## Run, build, and deploy

```sh
npm ci
npm run dev
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Use `npm run tauri dev` for the desktop shell. The static output is `dist/site`. The product’s durable static deployment command is:

```sh
/opt/fleet/lib/deploy-static.sh epub-annotation-bridge dist/site
```

Push a `v*` tag to build signed-status-independent desktop artifacts on GitHub Actions. `v0.1.2` is published with macOS arm64/x64 DMGs, a Windows x64 MSI, and Linux x64 AppImage/DEB assets at https://github.com/B-Divyesh/sf-epub-annotation-bridge/releases/tag/v0.1.2.

## Storage and network behavior

- Real ledger: browser `localStorage` key `epub-bridge:ledger:v1`.
- Demo ledger: `sessionStorage` key `demo:epub-bridge:ledger:v1`; reset and leaving demo discard it.
- License: `localStorage` key `sb_license:epub-annotation-bridge`. Only that token may be sent to Sociobot for verification.
- Download page: public GitHub release metadata only, cached for one hour; it shows a release-page fallback if unavailable.
- No analytics, telemetry, third-party fonts, or runtime CDN scripts.

## Known limits and operator action

- Sociobot must register the existing one-time $19 offer before a checkout link can be enabled. Its exact public metadata is in `/work/.evidence/billing-offer.json`. Until then, paid folder watching is not purchasable; the free ledger, imports, and exports remain fully usable.
- Builds are unsigned. macOS users must right-click and choose Open; Windows shows its unsigned-app warning. Signing needs `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `WINDOWS_CERT_PFX`, and `WINDOWS_CERT_PASSWORD` in the release environment.
- Generated CFIs are stable bridge offsets for supported EPUB round trips, not vendor-specific DOM range objects.
- Folder watching requires a mounted filesystem path. Reader protocols without a filesystem, DRM removal, reader firmware, cloud sync, and book sales are deliberately outside this product.
