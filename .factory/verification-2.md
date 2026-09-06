# Repair verification 2

Date: 2026-09-06  
Scope: `epub-annotation-bridge-repair-1`

## Result

The static product deployment is healthy and the ten findings in `verification-1.md` are either fixed or, for billing registration, honestly guarded pending the authorised external operator. The desktop release matrix for `v0.1.2` passed and its public Linux consumer artifact was verified.

## Implementation identity

- Desktop implementation / release tag: `dc0838662343d18ee842134aaad47ea7f8e000ca` / `v0.1.2`
- Static routing implementation: `e7f0649f26d5d147955f43d1d5de3671945f2d82`
- Prior report commit: `07f9331586a317851dcb790bee4fcbf0c3cc0158`

## Reproduced checks and results

| Check | Result |
| --- | --- |
| Clean `npm ci && npm test && npm run build` | Passed: 5 unit and 24 browser tests; static build completed. |
| Clean native test after documented packages | Passed: 3 native tests. |
| Every declared claim command | Passed: all 13 commands from a clean checkout. |
| Production dependency audit | Passed: zero vulnerabilities. |
| Live desktop and phone sample flow | Passed: job, audience, and first action were clear before scrolling; five sample rows, persistent demo label, reset, and real-data isolation all verified. |
| Live route status | Passed: app routes 200; unknown route product 404 with HTTP 404. |
| Live URL contract | Passed: title/lang/main/alt/console checks clean. |
| Live axe | Passed: zero serious/critical findings on every required route. |
| Live Lighthouse | Passed: 99 performance, 100 accessibility, 100 best practices, 100 SEO. |
| GitHub release matrix | Passed: release verification plus Linux, Windows, macOS x64, and macOS arm64 bundles all succeeded. |
| Published consumer artifact | Passed: `latest.json` lists five installers; the Linux DEB matched `SHA256SUMS`, extracted into a clean tree, and stayed running under a virtual display. |
| Live download handoff | Passed: a fresh Linux browser saw a real v0.1.2 AppImage link with no console error. |

## Billing disposition

The checked `/checkout` URL was externally unregistered and returned 404. The product must not pretend checkout works. The repair leaves the paid $19 one-time deliverable intact, removes the broken link, publishes exact offer metadata for the billing operator, and adds a regression that prevents a checkout request until registration is complete. This is not a substitute for registration or entitlement; it is the honest safe state.

## Evidence

- Live evidence: `/work/.evidence/epub-annotation-bridge-repair-1-live`
- Billing registration metadata: `/work/.evidence/billing-offer.json`
- Catalog description: `/work/.evidence/catalog-description.txt`
- Claim inventory and exact commands: `.factory/claims.json`
