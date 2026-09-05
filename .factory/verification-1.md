# Verification 1 — move EPUB notes between readers

## Verdict

**FAIL**

- Findings: **10** — 1 high, 6 medium, 3 low.
- Untested public claims: **6**.
- Implementation candidate: `15b660fd2b37dfe037ba5d004e86d870a2ea5d16` (`v0.1.0`).
- Documentation commit reviewed: `56bb4d269deabaabea04b40b055b9404d947d4d6`.
- Live URL: <https://epub-annotation-bridge.sociobot.in>
- Verified: 2026-09-05 UTC.

`v0.1.0` points to the implementation candidate. The only later repository change before this review is the handoff-only commit `56bb4d2`. A clean build at the documentation commit produced the same HTML, main JavaScript, and CSS bytes served live.

## First screen before scrolling

- Job: **Move EPUB notes between readers**.
- Audience: readers moving legal EPUBs between Calibre, KOReader, and Kobo.
- First action: **Try it with sample data**. The adjacent text says that it opens five matched highlights without touching the library.
- Desktop and Pixel 7 profiles both showed the job, audience, action, and three privacy/offline/price facts without horizontal overflow at default text size.

## Findings

### V1-01 — High — The public purchase action is broken

Both live **Buy the desktop tools — $19** links target the product checkout endpoint. A direct request returned HTTP 404 with `{"error":"enabled factory product","status":404}`. The free ledger remains usable, but nobody can buy the advertised folder tools. The earlier handoff called billing registration an operator action; it is still unresolved on the live product.

### V1-02 — Medium — Filtering does not hide nonmatching notes

On live desktop and phone demos, entering `no result exists` in **Filter notes** leaves all five rows visible. The input handler sets each row's `hidden` property, but the author rule `.ledger-row { display: grid }` overrides the browser's hidden presentation. This is a failed normal and boundary user path and has no regression test.

### V1-03 — Medium — The interface loses content at 200% text size

At the Pixel 7 viewport with root text doubled, document width grew from 412 to 478 CSS pixels. The wordmark was visibly clipped and horizontal scrolling was required. This fails the attached 200% text-resize requirement.

### V1-04 — Medium — File controls have no visible keyboard focus

Tab reaches `#epub-input` and `#annotation-input`, but each input has `opacity: 0`. The 3 px outline is applied to that transparent input, while its visible label has no `:focus-within` treatment. The captured keyboard state shows no visible focus indicator on **Choose EPUBs**.

### V1-05 — Medium — Several phone touch targets are below 44 px

Measured on the live Pixel 7 profile: **Reset demo** is 69×28 px, **Start for real** is 78×20 px, footer links are 18 px high, the wordmark is 35 px high, and the **Demo** navigation link is 40 px wide. This conflicts with the attached 44×44 px baseline and the design file's “every control” commitment.

### V1-06 — Medium — The EPUB parser ships a known denial-of-service vulnerability

Fresh `npm ci` followed by `npm audit --json` reports direct dependency `fflate@0.8.2`, advisory `GHSA-px8p-9vwx-vf98`. A malformed ZIP64 archive can make `unzipSync` loop indefinitely. EPUBs are ZIP archives selected from outside the app, so this affects an in-scope input path. `fflate@0.8.3` is available without a major-version change. The previous handoff's “0 vulnerabilities” result is no longer current.

### V1-07 — Medium — Three declared claim tests do not prove their full claims

- `safe-sidecar` calls `safe_sidecar_path` but never calls `write_sidecar` or asserts that a new JSON file was written.
- `folder-watcher` proves only that a raw filesystem event arrives. It does not exercise Calibre scanning, reader scanning, or a change flowing into the ledger.
- `license-verify` checks only the text **License active** in a browser. Browser mode cannot render the Tauri-only folder controls, so the test does not prove that a valid license activates those desktop tools.

These three claims count as untested because their observable promised outcomes are not covered end to end.

### V1-08 — Low — The documented clean setup cannot run the native claim commands

README requirements list Node.js 22, npm, and Rust stable. From a fresh checkout following those instructions, the first Cargo claim command failed because `glib-2.0.pc` was unavailable. After installing the Linux packages used by the release workflow (`libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, and `patchelf`), both Rust claims passed. The missing prerequisite list remains a documentation defect.

### V1-09 — Low — The designed 404 page returns HTTP 200

`/not-a-real-page` renders the correct styled not-found page with one h1, landmarks, and a working home action, but its HTTP response is 200. `staticwebapp.config.json` has a navigation fallback and no 404 response override. This is missing required 404 response structure, not a complaint about an intentional 404.

### V1-10 — Low — Public claims are absent from the claim registry

The README publicly says the app reads documented Kobo database records, the one-line installers verify SHA-256, and release metadata is cached for one hour with an offline fallback. None appears in `.factory/claims.json`. The release cache and fallback worked in manual browser checks, and the published DEB checksum matched, but these claims lack required repeatable sandbox commands. They account for three untested public claims.

## Demo and live behavior

The one-click sample passed on fresh desktop and phone contexts:

- `/demo` loaded five realistic public-domain highlights from three books.
- The persistent **Demo — sample data, nothing is saved** label, **Reset demo**, and **Start for real** remained available.
- A pre-seeded real ledger stayed byte-for-byte unchanged while the demo loaded, imported another row, exported, and reset.
- Demo storage used `sessionStorage` key `demo:epub-bridge:ledger:v1`; the real ledger used its separate `localStorage` key.
- JSON and Markdown exports each contained all five quotes; JSON records included CFIs.
- Reset restored five rows, leaving demo cleared on **Start for real** and preserving the real sentinel row.
- Unsupported extension and malformed JSON errors were shown. A valid CSV import succeeded immediately after either error.
- After one online load, the live demo reloaded offline with five rows and exported JSON.
- Reduced-motion mode reduced the row animation to `0.01ms`.

No live console or page errors occurred across `/`, `/demo`, `/ledger`, `/download`, `/privacy`, `/terms`, and the styled unknown route. Axe found zero serious or critical issues on those live routes; the keyboard, resizing, and touch findings above are outside that clean axe result.

## Declared claim commands

All nine commands from `.factory/claims.json` were run from a separate clean checkout at `56bb4d2`.

| Claim | Declared command | Result |
| --- | --- | --- |
| `demo-sandbox` | `npm test -- --grep @claim:demo-sandbox` | Passed, desktop and phone |
| `portable-export` | `npm test -- --grep @claim:portable-export` | Passed, desktop and phone |
| `local-processing` | `npm test -- --grep @claim:local-processing` | Passed, desktop and phone |
| `offline-export` | `npm test -- --grep @claim:offline-export` | Passed, desktop and phone |
| `annotation-import` | `npm run test:unit -- -t @claim:annotation-import` | Passed |
| `epub-quote-match` | `npm run test:e2e -- --grep @claim:epub-quote-match --project=chromium` | Passed |
| `safe-sidecar` | `cargo test --manifest-path src-tauri/Cargo.toml claim_safe_sidecar_preserves_existing_file` | Failed before undocumented Linux packages; passed after installation; incomplete assertion (V1-07) |
| `folder-watcher` | `cargo test --manifest-path src-tauri/Cargo.toml claim_folder_watcher_reports_a_change` | Passed after prerequisites; incomplete assertion (V1-07) |
| `license-verify` | `npm run test:e2e -- --grep @claim:license-verify --project=chromium` | Passed recorded response; incomplete assertion (V1-07) |

No declared command was left unrun. “Untested public claims” refers to incomplete claim outcomes and public statements outside the registry.

## Other verification

- `npm test`: passed 4 unit and 16 browser tests.
- `npm run build`: passed and produced `dist/site`.
- `cargo test --manifest-path src-tauri/Cargo.toml`: passed 2 tests after installing native prerequisites.
- Initial JavaScript: 35.83 KB raw / 13.99 KB gzip. CSS: 14.01 KB raw / 4.04 KB gzip.
- Live Lighthouse mobile: performance 100, accessibility 100, best practices 100, SEO 100; FCP 1.0 s, LCP 1.0 s, TBT 40 ms, CLS 0.
- Live CSP, HSTS, referrer policy, content-type protection, and permissions policy headers were present.
- Internal routes and static assets resolved; the release page and Param Factory footer link returned 200.
- The download page selected the real `v0.1.0` Linux AppImage. Its one-hour cache made one GitHub API request across two loads, and an aborted API request produced the calm release-page fallback.
- Release workflow run `33178489945` completed successfully for candidate `15b660f`.
- `latest.json` parsed and listed five installers: two DMGs, MSI, AppImage, and DEB.
- The published DEB independently matched `SHA256SUMS`.
- The DEB was extracted into a clean consumer data/config profile. The executable opened a 1280×820 window and loaded the five-row in-app demo without an application error.
- Invalid live license verification returned **License no longer active**, stored only the entered token, and stripped it from the address bar.
- This product has no backend, tenant model, or updater claim, so tenant isolation, service restart persistence, health, 429/Retry-After, and update checks are not applicable.

## Earlier finding disposition

No earlier review or verification report exists in repository history. The builder handoff listed these gaps:

- Release assets pending: resolved; seven release assets exist, including manifests and five installers.
- Billing registration: unresolved and now V1-01.
- Code signing: still pending, accurately disclosed on the download page, and explicitly optional in this work order.
- Vendor-neutral CFI limits, mounted-filesystem-only watching, and no DRM support: still accurately disclosed scope limits.

## Evidence

- `/work/.evidence/live/home-desktop.png`
- `/work/.evidence/live/home-phone.png`
- `/work/.evidence/live/live-qa.json`
- `/work/.evidence/live/live-offline.json`
- `/work/.evidence/live/recovery-boundary.json`
- `/work/.evidence/live/keyboard-file-focus.png`
- `/work/.evidence/live/text-200-phone.png`
- `/work/.evidence/live/lighthouse.json`
- `/work/.evidence/live/installed-deb-window-after-load.png`
- `/work/.evidence/live/installed-deb-demo.png`
- `/work/.evidence/release-SHA256SUMS`
- `/work/.evidence/release-latest.json`

## Required next steps

1. Register the billing product or remove the live purchase action until checkout works.
2. Fix filtering and add a browser regression test.
3. Fix text reflow, file-input focus treatment, and undersized targets.
4. Upgrade `fflate` and rerun malformed-EPUB checks.
5. Make each incomplete or unlisted public claim fully observable in `.factory/claims.json`.
6. Document Linux native prerequisites and configure a real HTTP 404 response.
