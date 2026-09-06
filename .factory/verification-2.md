# Verification 2 — move EPUB notes between readers

Date: 2026-09-06 UTC
Live URL: <https://epub-annotation-bridge.sociobot.in>

## Verdict

**FAIL**

- Findings: **4** — 3 medium, 1 low.
- Untested public claims: **3**.
- Static implementation candidate: `e7f0649f26d5d147955f43d1d5de3671945f2d82`.
- Desktop implementation and release: `dc0838662343d18ee842134aaad47ea7f8e000ca` (`v0.1.2`).
- Documentation commit reviewed: `eee4a3fc0e71d3daecfe9a4c110a4b8bc74b707e`.

The live application, release artifacts, core demo, and all 13 declared commands work. Acceptance still fails because the first desktop screen omits its required primary action at a common viewport, mobile download detection is wrong, installer assurances remain incompletely tested, and several headings violate the plain-words contract.

## First screen before scrolling

- Job: **Move EPUB notes between readers**.
- Audience: readers moving legal EPUBs between Calibre, KOReader, and Kobo.
- First action: **Try it with sample data**.

At 390×844, all three are visible without scrolling. At 1366×768, the action starts at CSS y=777 and does not intersect the viewport. The adjacent explanation starts lower still. The installed app's default 1280×820 window also clips the action at its bottom edge.

## Findings

### V2-01 — Medium — The desktop first screen hides the primary action

At 1366×768, the job and audience are visible, but **Try it with sample data** is entirely below the viewport. Its measured rectangle begins at y=777. The adjacent explanation is also below the fold. In the packaged app's default 1280×820 window, the button is only partly visible.

This fails the first-screen contract requiring the job, audience, first action, and its result before scrolling. Evidence: `/work/.evidence/epub-annotation-bridge-verify-2/home-desktop-1366x768.png` and `installed-desktop-home.png`.

### V2-02 — Medium — Phone visitors receive unusable desktop downloads

The public README says the download page detects macOS, Windows, or Linux. In fresh device contexts:

- Pixel 7 was labelled **Download for Linux** and linked to the x64 AppImage.
- iPhone 13 was labelled **Download for macOS** and linked to the arm64 DMG.

The implementation checks `Mac`, then `Win`, and treats every other user agent as Linux. The `release-fallback` test calculates its expected platform with the same logic, so it cannot detect this wrong classification. Platform detection is also absent as its own claim in `.factory/claims.json`.

This is one untested public claim. Evidence: `download-android.png` and `download-iphone.png` in the verification evidence directory.

### V2-03 — Medium — Installer claims remain incomplete across platforms

The declared `installer-checksum` claim says the macOS and Linux installer accepts a matching AppImage and refuses a changed one. macOS does not use an AppImage; `install.sh` selects a DMG there. The tagged test always stubs `uname` as Linux and exercises only the AppImage branch. It never checks the macOS DMG branch.

The public Windows PowerShell install command is also not exercised by any tagged claim test or by the release workflow. The workflow builds the MSI but does not run `install.ps1` in a consumer setup.

The Linux behavior itself passed: the tagged fixture test accepted the matching file and rejected a changed checksum, and the published DEB matched `SHA256SUMS`. The macOS and Windows installer paths account for two untested public claims. This leaves the installer part of V1-10 only partially resolved.

### V2-04 — Low — Several headings and labels use the prohibited editorial metaphor

The site still uses decorative or metaphorical copy including **Local annotation ledger · Issue 01**, **Read the note, not the database**, **The margin rule**, **Ledger desk · Sample issue**, and **Loose leaf / 404**. The 404 heading says **This page is not in the ledger**.

These phrases fit the visual theme but do not name their sections directly. They conflict with the supplied plain-words requirement to use no metaphor, mood headings, or invented lore.

## Declared claim commands

All 13 command entries were run from a clean clone at `eee4a3f`. The four documented Ubuntu packages were installed before the native results below were accepted. An initial native attempt before those packages were present stopped at missing `glib-2.0`; after following README setup, every native command passed.

| Claim | Command result | Outcome review |
| --- | --- | --- |
| `demo-sandbox` | Pass, desktop and mobile | Five isolated rows, persistent banner, reset, and unchanged real sentinel. |
| `portable-export` | Pass, desktop and mobile | Markdown and JSON each contained all five notes; JSON retained CFIs. |
| `local-processing` | Pass, desktop and mobile | No cross-origin request during the complete demo flow. |
| `offline-export` | Pass, desktop and mobile | Offline reload retained five rows and exported JSON. |
| `annotation-import` | Pass | KOReader Lua, Kobo CSV, and bridge JSON parsed. |
| `epub-quote-match` | Pass | Generated EPUB quote matched and received an EPUB CFI. |
| `safe-sidecar` | Pass | A second JSON file was written; the existing file remained unchanged. |
| `folder-watcher` | Pass | Calibre scan, filesystem event, Kobo rescan, and imported annotation were asserted. |
| `license-verify` | Pass | Recorded valid response exposed the Tauri-only **Choose folders** control. |
| `kobo-database-import` | Pass | Quote, source, and CFI were read from a temporary Kobo database. |
| `installer-checksum` | Command passes | Incomplete for macOS; see V2-03. |
| `release-fallback` | Pass, desktop and mobile | One-hour cache and request-failure fallback were asserted. Platform detection remains unlisted; see V2-02. |
| `checkout-registration` | Pass, desktop and mobile | No checkout link or checkout request exists while registration is pending. |

No declared command was skipped. The three untested counts are public platform detection, the macOS installer branch, and the Windows installer path.

## Live product checks

- Fresh desktop and phone demo contexts loaded five realistic highlights from Walden, Pride and Prejudice, and Frankenstein.
- The demo banner remained after reset. **Start for real** cleared `demo:epub-bridge:ledger:v1` and preserved the real-ledger sentinel unchanged.
- Filtering returned two Walden rows and zero rows for an impossible query, with the correct empty explanation.
- Unsupported input produced a specific recovery message; a valid CSV then imported one row.
- A fresh online load could be reloaded offline with five rows and could export `annotation-ledger.json`.
- The visible file-control label received a 3px focus outline with a 3px offset. Keyboard navigation, skip-link activation, route focus, browser back, and route announcements worked.
- At 390 px and at doubled root text, measured horizontal overflow was zero. Required phone targets measured at least 44 px in each dimension.
- Reduced motion changed row animation and transition durations to 0.01 ms.
- Live axe checks found zero serious or critical issues on `/`, `/demo`, `/ledger`, `/download`, `/privacy`, `/terms`, and the unknown route.
- Each route had `lang=en`, one h1, one main landmark, ordered headings, and no image missing alt text. Titles were route-specific.
- `/`, `/demo`, `/ledger`, `/download`, `/privacy`, and `/terms` returned 200. `/not-a-real-page` returned the designed page with HTTP 404.
- Internal links, `robots.txt`, `sitemap.xml`, the web manifest, and both installer scripts returned successfully. The GitHub release and Param Factory links returned 200.
- The live demo sent no cross-origin requests. The download page requested only public GitHub release data. A fake invalid license sent only that token to the named Sociobot verification endpoint and returned **License no longer active**.
- The supplied `verify-url.sh` passed with no console errors. The single browser resource error observed during the route sweep was the expected top-level HTTP 404 navigation, not a defect.
- Lighthouse mobile: performance 96, accessibility 100, best practices 100, SEO 100; FCP 1.0 s, LCP 2.1 s, TBT 180 ms, CLS 0.
- Built output: entry JavaScript 36.50 KB raw / 14.27 KB gzip; CSS 15.28 KB raw / 4.27 KB gzip.
- Live `index.html`, entry JavaScript, CSS, service worker, and `404.html` hashes exactly matched the clean build. Later commits after `e7f0649` are documentation-only.

## Release and clean consumer check

- GitHub Actions run `34016620403` completed successfully for `dc08386`: verify, Linux AppImage/DEB, Windows MSI, macOS x64 DMG, macOS arm64 DMG, and release jobs all passed.
- Release `v0.1.2` contains five platform installers plus `SHA256SUMS` and valid `latest.json` metadata.
- The Linux DEB matched the published checksum.
- The DEB was extracted into a clean package tree and launched with isolated config, data, cache, and home directories under a virtual display. It remained running until the 12-second verifier timeout.
- The installed app's sample action opened the five-row demo. Screenshots show the persistent demo banner, counts, realistic quotes, notes, CFIs, export controls, and the Tauri-only **Write sidecar** control.
- Builds are unsigned and the download page says so. There is no updater dependency or updater promise. This product has no backend, tenant model, server persistence, health route, or product rate limit, so those checks do not apply.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| V1-01 broken checkout | User-facing defect fixed. No checkout link or request is present while registration remains external. |
| V1-02 filtering | Fixed live and covered by browser regression. |
| V1-03 200% overflow | Fixed; zero horizontal overflow at 390 px with 32 px root text. |
| V1-04 file chooser focus | Fixed; visible label has a 3px focus outline and offset. |
| V1-05 small touch targets | Fixed for measured visible controls; minimum was 44 px. |
| V1-06 vulnerable `fflate` | Fixed at 0.8.3; production audit reports zero vulnerabilities. |
| V1-07 incomplete sidecar, watcher, and license outcomes | Fixed; each repaired test now asserts the promised observable result. |
| V1-08 missing native prerequisites | Fixed in README and reproduced successfully. |
| V1-09 HTTP 200 on unknown routes | Fixed; the designed page now returns HTTP 404. |
| V1-10 unlisted claims | Kobo, release fallback, and checkout status are fixed. Installer coverage remains partial and platform detection remains unlisted; see V2-02 and V2-03. |

## Evidence

Evidence is under `/work/.evidence/epub-annotation-bridge-verify-2/`:

- desktop, phone, 200% text, mobile download, installed-app, and populated-ledger screenshots;
- `verify-url/verify.json` and its screenshots;
- `lighthouse.json`;
- release API metadata, `latest.json`, `SHA256SUMS`, and the verified Linux DEB;
- clean-checkout command output is summarized above.

## Required next steps

1. Keep the primary action and its explanation within common desktop first-screen heights, including the app's default window.
2. Treat Android and iOS as unsupported mobile visitors instead of mapping them to Linux and macOS downloads; add a non-tautological platform matrix claim test.
3. Correct the AppImage wording and add tagged macOS DMG and Windows PowerShell installer outcome tests.
4. Replace decorative editorial labels and metaphorical headings with direct section names.
