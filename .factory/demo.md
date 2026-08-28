# Demo sandbox

- URL: `https://epub-annotation-bridge.sociobot.in/demo` (locally: `http://127.0.0.1:4173/demo`).
- Sample: five highlights from three public-domain books. They represent KOReader and Kobo records, exact CFIs, quote matches, and notes.
- Storage: `sessionStorage` under `demo:epub-bridge:ledger:v1`. The real ledger uses `localStorage` under `epub-bridge:ledger:v1` and is never read in demo mode.
- Reset: choose **Reset demo** in the persistent banner. **Start for real** clears the demo namespace before opening `/ledger`.
- Verify: `npm test -- --grep @claim:demo-sandbox`.
