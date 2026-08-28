# EPUB Annotation Bridge

Move highlights and notes between sideloaded EPUB readers through a readable, local ledger.

EPUB Annotation Bridge is for people who manage legal EPUBs with Calibre and read on KOReader or Kobo. It imports KOReader Lua, Kobo CSV, and bridge JSON files. When you add the matching EPUB, it finds unmatched quotes inside chapters and records a portable EPUB CFI.

The free ledger exports every note as Markdown and JSON. Saved ledgers and core exports work offline. The desktop app can also write a new JSON sidecar without replacing an existing sidecar.

## Try the isolated demo

Open `/demo` locally or visit <https://epub-annotation-bridge.sociobot.in/demo>. It loads five public-domain sample highlights in `sessionStorage` under `demo:epub-bridge:ledger:v1`. Demo actions never read or write the real ledger.

Use **Reset demo** for a clean sample. Use **Start for real** to clear the demo namespace and open the local ledger.

## Supported paths

- Import KOReader `metadata.epub.lua` exports.
- Import Kobo CSV exports and documented Kobo database records.
- Import and round-trip bridge JSON ledgers.
- Match quotes against legal, unencrypted EPUB files.
- Export Markdown and JSON from the free ledger.
- Write collision-safe sidecar JSON files in the desktop app.
- Watch selected Calibre and mounted-reader folders with a paid license.

The app does not remove DRM, edit EPUB files, sell books, or provide cloud sync.

## Develop and verify

Requirements: Node.js 22, npm, and Rust stable for desktop work.

```sh
npm ci
npm run dev
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

`npm run build` is the deploy build command. It writes the static site to `dist/site`, with `index.html` at that root.

Run the Tauri shell during development:

```sh
npm run tauri dev
```

The browser demo and unit fixtures make every public claim testable without an account or private book.

## Install and release

The download page detects macOS, Windows, or Linux and reads release data from GitHub's CORS-enabled API. It keeps a one-hour local cache and shows a release-page fallback when offline.

One-line installers verify `SHA256SUMS` before installing:

```sh
curl -fsSL https://epub-annotation-bridge.sociobot.in/install.sh | sh
```

```powershell
irm https://epub-annotation-bridge.sociobot.in/install.ps1 | iex
```

Tags matching `v*` run `.github/workflows/release.yml`. The workflow tests the site and builds unsigned `.dmg`, `.msi`, `.AppImage`, and `.deb` bundles. It also publishes `SHA256SUMS` and `latest.json`.

## License unlock

The free ledger includes file imports and every export. A $19 one-time license activates selected-folder watching in the desktop app. Checkout and verification use the Sociobot billing API. No payment provider is embedded in this repository.

License tokens use `localStorage` key `sb_license:epub-annotation-bridge`. Verification results are cached for one day. The free experience never waits for a license request.

## Privacy and storage

Book text, highlights, notes, and filenames stay on the device. The app has no analytics or telemetry. License checks send only the license token to Sociobot. The download page asks GitHub only for public release metadata.

See [/privacy](https://epub-annotation-bridge.sociobot.in/privacy) and [/terms](https://epub-annotation-bridge.sociobot.in/terms).

## Project notes

- Product scope: [.factory/brief.json](.factory/brief.json)
- Visual system and asset provenance: [.factory/design.md](.factory/design.md)
- Demo contract: [.factory/demo.md](.factory/demo.md)
- Tested claims: [.factory/claims.json](.factory/claims.json)
- Build handoff: [.factory/handoff.md](.factory/handoff.md)

MIT licensed. Built by Param Factory.
