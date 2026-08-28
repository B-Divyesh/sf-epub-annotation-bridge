# Visual thesis — monochrome typographic broadsheet

## Why this fits

Annotations are marginalia: small, durable marks beside a larger text. The product therefore looks like a careful literary broadsheet crossed with an archival workbench. Dense rules, folio numbers, editorial columns, and proofreader marks make movement between devices feel like a documented transfer rather than a cloud sync. The interface stays quiet so book titles and quoted passages remain the visual subject.

## Palette

This is an intentionally single-mode, warm-paper system.

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#f2efe7` | page background |
| `--paper-raised` | `#fbfaf6` | input and work surfaces |
| `--ink` | `#171715` | primary copy |
| `--ink-soft` | `#57554f` | secondary copy |
| `--rule` | `#9a978e` | borders and column rules |
| `--signal` | `#9d2f24` | proofreader mark, focus, destructive emphasis |
| `--signal-dark` | `#742018` | hover and accessible small text |
| `--success` | `#285b3c` | completed transfers |
| `--warning` | `#765619` | partial matches |
| `--danger` | `#8b251e` | parsing failures |

All normal text pairs exceed 4.5:1. Color never carries state without a word or symbol.

## Type

- Display and quoted reading matter: Georgia, `Times New Roman`, serif. Large, sharp, and newspaper-like without a network font.
- Interface and metadata: Arial Narrow, `Arial`, sans-serif. Uppercase labels use tracking instead of extra weight.
- Body copy starts at 16px with 1.55 leading. Measures stop at 68 characters. Ledger counts use tabular figures.
- No external fonts are loaded. This keeps first paint small and offline-safe.

## Spacing and shape

- Base unit: 8px. Tight metadata may use 4px; major sections use 64–112px.
- Content grid: 12 columns on desktop, one column at 390px.
- Corners are 0–2px. The shape language is paper sheets, table rules, and square proof stamps.
- Buttons are 44px high with a black fill or a one-pixel rule. Links stay underlined.
- Desktop app chrome uses a narrow masthead, a three-step rail, and a broad ledger page. Mobile drops the persistent rail and exposes the same steps in document order.

## Interaction grammar

- Import → match → export is always shown as three numbered editorial stages.
- A selected quote receives a red margin bracket. Status changes arrive as small typeset proof stamps.
- Keyboard focus is a 3px red outline plus a paper-colored offset.
- Empty, parsing-error, offline, and saved states each state what happened and the next action.
- Destructive actions name their target and require confirmation; demo reset is safe and immediate.

## Motion policy

The signature motion is a 220ms horizontal “margin transfer”: when an import becomes a ledger row, a fine red rule travels from the source column to the ledger column while the row fades in. Page changes use 160ms opacity only. No motion loops. With `prefers-reduced-motion: reduce`, all transforms and scrolling become instant and only the final state appears.

## Original asset plan and prompt sheet

One generated editorial still shows two open, unbranded e-readers on a typesetter's table, connected by loose annotation slips. It explains the cross-device job without pretending to show the app UI. Crops provide the hero and 1200×630 social preview. Hand-authored SVG marks cover the wordmark, favicon, status stamps, and interface icons.

Prompt:

> Use case: stylized-concept. Asset type: landing-page editorial hero. A high-contrast black-and-ivory linocut editorial illustration of two open, generic unbranded e-readers on a typesetter's worktable. Narrow paper annotation slips travel between the devices and gather into a neat ledger. Overhead three-quarter view, asymmetric newspaper composition, visible paper grain, crisp carved ink hatching, sparse oxblood-red proofreader marks only, generous quiet margin, no people. Warm newsprint, black ink, restrained red accent. No readable text, no letters, no logos, no trademarks, no watermark, no gradients, no glossy 3D, no blue, no interface screenshot.

Provenance: generated for this product with the Param Factory Azure image deployment (`factory-image`) on 2026-08-28. The selected image and prompt sidecar live in `assets/src/`. Generated imagery is original and used under the product's MIT distribution.

## Responsive and accessibility policy

At 390px, masthead navigation wraps once, hero copy precedes art, tables become labelled records, and every control remains at least 44×44px. At 200% zoom, columns collapse rather than clip. Decorative rules are hidden from assistive technology. Generated art has purpose-based alt text. The document has one h1 per route, ordered headings, a skip link, landmark regions, and route-change focus management.
