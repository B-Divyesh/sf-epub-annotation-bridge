import './styles.css';
import { sampleAnnotations } from './sample';
import { loadLedger, saveLedger, resetDemo, leaveDemo } from './storage';
import { downloadText, ledgerJson, ledgerMarkdown } from './exporters';
import { parseAnnotationFile } from './parsers';
import { matchAnnotations } from './epub';
import { captureLicense, checkoutUrl, initialLicenseState, storeLicense, verifyLicense, type LicenseState } from './license';
import type { Annotation, BookFile, NativeScan } from './types';

declare global { interface Window { __TAURI_INTERNALS__?: unknown } }

const app = document.querySelector<HTMLDivElement>('#app')!;
const routeStatus = document.querySelector<HTMLDivElement>('#route-status')!;
const titles: Record<string, string> = {
  '/': 'EPUB Annotation Bridge — Move notes between readers',
  '/demo': 'Demo — EPUB Annotation Bridge', '/ledger': 'Ledger — EPUB Annotation Bridge',
  '/download': 'Download — EPUB Annotation Bridge', '/privacy': 'Privacy — EPUB Annotation Bridge',
  '/terms': 'Terms — EPUB Annotation Bridge', '/404': 'Not found — EPUB Annotation Bridge',
};
let license: LicenseState;
let books: BookFile[] = [];
let nativePaths: { calibre: string; reader: string } | null = null;
let nativeListenerReady = false;
let nativeRefreshTimer: number | undefined;

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!);
const route = () => location.pathname.replace(/\/$/, '') || '/';
const isDemo = () => route() === '/demo';
const isTauri = () => Boolean(window.__TAURI_INTERNALS__);

function header(): string {
  return `<a class="skip-link" href="#main">Skip to main content</a>
    <header class="masthead"><a class="wordmark" href="/" data-link><span aria-hidden="true">¶</span> EPUB Annotation Bridge</a>
      <nav aria-label="Main navigation"><a href="/demo" data-link>Demo</a><a href="/ledger" data-link>Ledger</a><a href="/download" data-link>Download</a><a href="/privacy" data-link>Privacy</a></nav>
    </header>`;
}

function footer(): string {
  return `<footer><p>Move EPUB notes between readers.</p><nav aria-label="Footer"><a href="/privacy" data-link>Privacy</a><a href="/terms" data-link>Terms</a><a href="https://hello-factory.sociobot.in" rel="external">Built by Param Factory <span class="sr-only">(external)</span></a></nav><p>v0.1.0 · Generated art disclosed in the design notes.</p></footer>`;
}

const stamp = (text: string, kind = '') => `<span class="stamp ${kind}">${escapeHtml(text)}</span>`;

function annotationRows(rows: Annotation[], limit?: number): string {
  const shown = typeof limit === 'number' ? rows.slice(0, limit) : rows;
  return shown.map((row) => `<article class="ledger-row" data-id="${escapeHtml(row.id)}">
    <div class="folio"><span>${escapeHtml(row.source)}</span><time datetime="${escapeHtml(row.createdAt)}">${escapeHtml(new Date(row.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' }))}</time></div>
    <div class="book-line"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.author)}</span><span>${escapeHtml(row.chapter)}</span></div>
    <blockquote>“${escapeHtml(row.quote)}”</blockquote>
    ${row.note ? `<p class="note"><span>Note</span> ${escapeHtml(row.note)}</p>` : ''}
    <div class="row-foot">${stamp(row.match === 'unmatched' ? 'Needs EPUB' : row.match === 'exact' ? 'CFI kept' : 'Quote matched', row.match)}<code>${escapeHtml(row.cfi || 'No CFI yet')}</code></div>
  </article>`).join('');
}

function landing(): string {
  return `${header()}<main id="main" tabindex="-1">
    <section class="hero broadsheet">
      <div class="hero-copy"><p class="kicker">Local annotation ledger · Issue 01</p><h1>Move EPUB notes between readers</h1>
        <p class="dek">For readers who move legal EPUBs between Calibre, KOReader, and Kobo.</p>
        <div class="hero-actions"><a class="button primary" href="/demo" data-link>Try it with sample data</a><span>See five matched highlights. Nothing touches your library.</span></div>
        <ul class="plain-facts"><li>Files stay on this device</li><li>Core exports work offline</li><li>Free ledger · $19 desktop tools</li></ul>
      </div>
      <figure class="hero-art"><picture><source type="image/avif" srcset="/assets/hero-640.avif 640w, /assets/hero.avif 1280w" sizes="(max-width: 850px) 100vw, 58vw"><source type="image/webp" srcset="/assets/hero-640.webp 640w, /assets/hero.webp 1280w" sizes="(max-width: 850px) 100vw, 58vw"><img src="/assets/hero.jpg" width="1280" height="853" fetchpriority="high" decoding="async" alt="Two e-readers pass paper annotation slips into a bound ledger."></picture><figcaption>One ledger sits between each reader.</figcaption></figure>
    </section>
    <section class="preview-section ruled" aria-labelledby="preview-title"><div class="section-label">The ledger / live sample</div>
      <div class="section-intro"><h2 id="preview-title">Read the note, not the database</h2><p>Each entry keeps the book, chapter, quote, note, source, and EPUB CFI in a plain record.</p></div>
      <div class="ledger-preview">${annotationRows(sampleAnnotations, 3)}</div><a class="text-link" href="/demo" data-link>Open all five sample highlights →</a>
    </section>
    <section class="how ruled" aria-labelledby="how-title"><div class="section-label">Transfer desk / three passes</div><h2 id="how-title">How the bridge works</h2>
      <ol class="steps"><li><b>01</b><h3>Choose your files</h3><p>Add EPUBs and KOReader Lua, Kobo CSV, or ledger JSON files.</p><figure class="walkthrough"><img src="/assets/walkthrough-import.webp" width="263" height="640" loading="lazy" decoding="async" alt="The transfer desk with controls for EPUBs and note files."><figcaption>Choose files from the transfer desk.</figcaption></figure></li><li><b>02</b><h3>Check each match</h3><p>The bridge keeps existing CFIs and finds unmatched quotes inside EPUB chapters.</p><figure class="walkthrough"><img src="/assets/walkthrough-match.webp" width="640" height="136" loading="lazy" decoding="async" alt="A Walden highlight with its book, chapter, note, and EPUB CFI."><figcaption>Review the quote and its match status.</figcaption></figure></li><li><b>03</b><h3>Export the ledger</h3><p>Save readable Markdown, portable JSON, or a new sidecar file.</p><figure class="walkthrough"><img src="/assets/walkthrough-export.webp" width="243" height="220" loading="lazy" decoding="async" alt="Export buttons for Markdown and JSON."><figcaption>Export a readable or portable copy.</figcaption></figure></li></ol>
    </section>
    <section class="limits ruled" aria-labelledby="limits-title"><div><p class="section-label">The margin rule</p><h2 id="limits-title">Your books remain unchanged</h2></div><div><p>The bridge reads legal, unencrypted EPUBs and exported annotation files.</p><p>It does not remove DRM, edit an EPUB, sell books, or send book text to a server.</p></div></section>
    <section class="price ruled" aria-labelledby="price-title"><p class="section-label">Desktop edition / one-time</p><h2 id="price-title">Watch two folders for $19</h2><p>The free ledger imports files and exports every note. A license adds Calibre and mounted-reader folder watching on desktop.</p><div class="price-actions"><a class="button primary" href="${checkoutUrl}">Buy the desktop tools — $19</a><a class="button" href="/download" data-link>Download the app</a></div><p class="fine">One-time purchase. Sociobot is the merchant of record. Core export stays free.</p></section>
  </main>${footer()}`;
}

function demoBanner(): string {
  return `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><div><button id="reset-demo" class="link-button">Reset demo</button><a href="/ledger" id="leave-demo" data-link>Start for real</a></div></aside>`;
}

function workbench(demo: boolean): string {
  let annotations = loadLedger(demo);
  if (demo && !annotations.length) { annotations = [...sampleAnnotations]; saveLedger(true, annotations); }
  const exact = annotations.filter((row) => row.match === 'exact').length;
  const matched = annotations.filter((row) => row.match === 'quote').length;
  const unmatched = annotations.filter((row) => row.match === 'unmatched').length;
  return `${header()}${demo ? demoBanner() : ''}<main id="main" class="workbench" tabindex="-1">
    <section class="ledger-head"><div><p class="kicker">Ledger desk · ${demo ? 'Sample issue' : 'Local library'}</p><h1>${demo ? 'Inspect a sample annotation ledger' : 'Build your annotation ledger'}</h1><p>${demo ? 'These five records stay in a separate demo session.' : 'Choose exported notes and EPUBs. Your ledger stays in this browser.'}</p></div>
      <div class="tally" aria-label="Match totals"><span><b>${annotations.length}</b> notes</span><span><b>${exact}</b> CFI kept</span><span><b>${matched}</b> quote matched</span><span><b>${unmatched}</b> need EPUB</span></div></section>
    <section class="desk" aria-labelledby="desk-title"><div class="transfer-rail"><h2 id="desk-title">Transfer desk</h2>
      <div class="rail-step"><b>01</b><h3>Add EPUBs</h3><p>Used only to find the chapter and quote position.</p><label class="button file-button">Choose EPUBs<input id="epub-input" type="file" accept=".epub,application/epub+zip" multiple></label><output id="book-count">${books.length ? `${books.length} EPUBs ready` : 'No EPUBs chosen'}</output></div>
      <div class="rail-step"><b>02</b><h3>Import notes</h3><p>Choose KOReader Lua, Kobo CSV, or ledger JSON.</p><label class="button primary file-button">Import notes<input id="annotation-input" type="file" accept=".lua,.csv,.json" multiple></label></div>
      ${!demo && isTauri() ? `<div class="rail-step paid-tools"><b>↻</b><h3>Watch folders</h3><p>Connect a Calibre library and a mounted reader.</p>${license.unlocked ? '<button id="connect-folders" class="button">Choose folders</button>' : `<a class="button" href="/download#license" data-link>Activate $19 tools</a>`}</div>` : ''}
      <div class="rail-step"><b>03</b><h3>Export</h3><p>Exports never omit notes.</p><button id="export-md" class="button" ${annotations.length ? '' : 'disabled'}>Export Markdown</button><button id="export-json" class="button" ${annotations.length ? '' : 'disabled'}>Export JSON</button>${isTauri() ? `<button id="write-sidecar" class="button" ${annotations.length ? '' : 'disabled'}>Write sidecar</button>` : ''}</div>
      <p id="desk-status" class="status" role="status">Ready. Choose a file to begin.</p>
    </div><div class="ledger-paper"><div class="ledger-toolbar"><div><span class="section-label">Book-CFI ledger</span><h2>Annotations</h2></div><label>Filter notes<input id="filter" type="search" placeholder="Book, chapter, or quote"></label></div>
      <div id="ledger-list">${annotations.length ? annotationRows(annotations) : `<div class="empty"><span aria-hidden="true">¶</span><h3>No annotations yet</h3><p>Import an exported note file. Matched records will appear here.</p></div>`}</div></div></section>
  </main>${footer()}`;
}

function legal(kind: 'privacy' | 'terms'): string {
  const privacy = `<p class="kicker">Policy / local first</p><h1>Your reading data stays yours</h1><p>EPUB Annotation Bridge stores the real ledger in your browser or desktop app. Demo records use separate session storage.</p>
    <h2>What the app reads</h2><p>You choose each EPUB, annotation file, Calibre folder, or mounted-reader folder. The app does not read other folders.</p>
    <h2>What leaves the device</h2><p>No book text, highlight, note, or filename leaves your device. License checks send only the license token to Sociobot. The download page asks GitHub for public release details.</p>
    <h2>How to remove data</h2><p>Clear this site’s storage or remove the desktop app’s data folder. Demo data ends with its browser session.</p>`;
  const terms = `<p class="kicker">Terms / v0.1.0</p><h1>Use the bridge with books you may read</h1><p>You may use the app with legal, unencrypted EPUBs and annotation data you can export or access.</p>
    <h2>No DRM removal</h2><p>The app does not bypass access controls. You are responsible for the files you choose.</p>
    <h2>One-time license</h2><p>The $19 purchase activates folder watching for one person. Sociobot is the merchant of record. Refunds revoke the license.</p>
    <h2>No warranty</h2><p>The software is provided as-is under the MIT License. Keep a backup before moving or deleting device files.</p>`;
  return `${header()}<main id="main" class="prose" tabindex="-1">${kind === 'privacy' ? privacy : terms}</main>${footer()}`;
}

function downloadPage(): string {
  return `${header()}<main id="main" class="download-page" tabindex="-1"><section><p class="kicker">Desktop app / v0.1.0</p><h1>Install the folder-watching desktop app</h1><p>Choose your platform. Builds are unsigned until the release certificates are added.</p><div id="download-state" class="download-state" aria-live="polite"><span class="loader">Checking the latest release…</span></div>
    <div class="install-commands"><h2>Install from a terminal</h2><p>macOS or Linux</p><code>curl -fsSL https://epub-annotation-bridge.sociobot.in/install.sh | sh</code><p>Windows PowerShell</p><code>irm https://epub-annotation-bridge.sociobot.in/install.ps1 | iex</code><p class="fine">Each script checks the release SHA-256 before installing.</p></div></section>
    <section id="license" class="license-box" aria-labelledby="license-title"><p class="section-label">License / one-time</p><h2 id="license-title">Add folder watching for $19</h2><p>The free app keeps file import and every export. The license adds live Calibre and mounted-reader folder watching.</p>
      <a class="button primary" href="${checkoutUrl}">Buy the desktop tools — $19</a><form id="license-form"><label for="license-token">Have a license? Paste it here</label><div><input id="license-token" name="license" autocomplete="off"><button class="button" type="submit">Verify license</button></div></form><p id="license-status" role="status">${escapeHtml(license.message)}</p><p class="fine">One-time purchase. Sociobot is the merchant of record. <a href="/terms" data-link>Read the terms.</a></p></section>
  </main>${footer()}`;
}

function notFound(): string {
  return `${header()}<main id="main" class="not-found" tabindex="-1"><p class="giant-mark" aria-hidden="true">¶?</p><p class="kicker">Loose leaf / 404</p><h1>This page is not in the ledger</h1><p>The address may be old or mistyped.</p><a class="button primary" href="/" data-link>Return to the front page</a></main>${footer()}`;
}

function render(moveFocus = false): void {
  const path = route();
  const known = ['/', '/demo', '/ledger', '/download', '/privacy', '/terms'];
  const page = !known.includes(path) ? '/404' : path;
  document.title = titles[page];
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `https://epub-annotation-bridge.sociobot.in${page === '/404' ? path : page}`);
  app.innerHTML = page === '/' ? landing() : page === '/demo' ? workbench(true) : page === '/ledger' ? workbench(false) : page === '/download' ? downloadPage() : page === '/privacy' || page === '/terms' ? legal(page.slice(1) as 'privacy' | 'terms') : notFound();
  bindLinks();
  if (page === '/demo' || page === '/ledger') bindWorkbench(page === '/demo');
  if (page === '/download') { bindLicense(); void loadDownloads(); }
  if (moveFocus) {
    const h1 = app.querySelector<HTMLElement>('h1'); h1?.setAttribute('tabindex', '-1'); h1?.focus();
    routeStatus.textContent = document.title;
  }
}

function bindLinks(): void {
  app.querySelectorAll<HTMLAnchorElement>('a[data-link]').forEach((link) => link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (isDemo() && new URL(link.href).pathname !== '/demo') leaveDemo();
    history.pushState({}, '', new URL(link.href).pathname + new URL(link.href).hash);
    render(true); scrollTo(0, 0);
  }));
}

function setStatus(message: string, error = false): void {
  const output = document.querySelector<HTMLOutputElement>('#desk-status');
  if (output) { output.textContent = message; output.classList.toggle('error', error); }
}

function bindWorkbench(demo: boolean): void {
  document.querySelector('#reset-demo')?.addEventListener('click', () => { resetDemo(); render(); setStatus('Demo restored to five sample highlights.'); });
  const epubInput = document.querySelector<HTMLInputElement>('#epub-input');
  epubInput?.addEventListener('change', async () => {
    books = [...(epubInput.files ?? [])].map((file) => ({ id: `${file.name}:${file.size}`, title: file.name.replace(/\.epub$/i, ''), author: '', file }));
    const output = document.querySelector<HTMLOutputElement>('#book-count'); if (output) output.textContent = `${books.length} EPUB${books.length === 1 ? '' : 's'} ready`;
    if (books.length) setStatus(`${books.length} EPUB${books.length === 1 ? '' : 's'} ready for quote matching.`);
  });
  const annotationInput = document.querySelector<HTMLInputElement>('#annotation-input');
  annotationInput?.addEventListener('change', async () => {
    try {
      let incoming: Annotation[] = [];
      for (const file of [...(annotationInput.files ?? [])]) incoming.push(...parseAnnotationFile(file.name, await file.text()));
      incoming = await matchAnnotations(incoming, books);
      const current = loadLedger(demo);
      const merged = [...current];
      for (const row of incoming) if (!merged.some((existing) => existing.id === row.id)) merged.push(row);
      saveLedger(demo, merged); render(); setStatus(`Imported ${incoming.length} highlight${incoming.length === 1 ? '' : 's'}.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'The notes could not be imported. Check the file and try again.', true); }
  });
  document.querySelector('#export-md')?.addEventListener('click', () => { downloadText('annotation-ledger.md', ledgerMarkdown(loadLedger(demo)), 'text/markdown'); setStatus('Markdown exported.'); });
  document.querySelector('#export-json')?.addEventListener('click', () => { downloadText('annotation-ledger.json', ledgerJson(loadLedger(demo)), 'application/json'); setStatus('JSON exported.'); });
  document.querySelector<HTMLInputElement>('#filter')?.addEventListener('input', (event) => {
    const value = (event.currentTarget as HTMLInputElement).value.toLowerCase();
    document.querySelectorAll<HTMLElement>('.ledger-row').forEach((row) => row.hidden = !row.textContent!.toLowerCase().includes(value));
  });
  document.querySelector('#connect-folders')?.addEventListener('click', connectFolders);
  document.querySelector('#write-sidecar')?.addEventListener('click', () => void writeSidecar(demo));
}

async function connectFolders(): Promise<void> {
  try {
    const [{ open }, { invoke }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/api/core')]);
    const calibre = await open({ directory: true, title: 'Choose the Calibre library' });
    if (!calibre) { setStatus('No Calibre library was chosen.'); return; }
    const reader = await open({ directory: true, title: 'Choose the mounted reader' });
    if (!reader) { setStatus('No mounted reader was chosen.'); return; }
    nativePaths = { calibre: String(calibre), reader: String(reader) };
    const scan = await invoke<NativeScan>('scan_sources', { calibrePath: nativePaths.calibre, readerPath: nativePaths.reader });
    const imported = importNativeScan(scan);
    await invoke('watch_paths', { paths: [nativePaths.calibre, nativePaths.reader] });
    await bindNativeWatcher();
    render(); setStatus(`Connected ${scan.books.length} Calibre books and imported ${imported} highlights. Watching both folders.`);
  } catch (error) { setStatus(`The folders could not be connected. ${String(error)} Choose them again.`, true); }
}

function importNativeScan(scan: NativeScan): number {
  const rows = [...scan.annotations];
  for (const file of scan.annotationFiles) {
    try { rows.push(...parseAnnotationFile(file.name, file.content)); } catch { /* Ignore unrelated exports on the reader. */ }
  }
  const merged = [...loadLedger(false)];
  for (const row of rows) if (!merged.some((existing) => existing.id === row.id)) merged.push(row);
  saveLedger(false, merged);
  return rows.length;
}

async function bindNativeWatcher(): Promise<void> {
  if (nativeListenerReady) return;
  const [{ listen }, { invoke }] = await Promise.all([import('@tauri-apps/api/event'), import('@tauri-apps/api/core')]);
  await listen<string[]>('source-changed', () => {
    window.clearTimeout(nativeRefreshTimer);
    nativeRefreshTimer = window.setTimeout(async () => {
      if (!nativePaths) return;
      try {
        const scan = await invoke<NativeScan>('scan_sources', { calibrePath: nativePaths.calibre, readerPath: nativePaths.reader });
        const imported = importNativeScan(scan);
        render();
        setStatus(`Folders changed. Checked ${imported} highlights and refreshed the ledger.`);
      } catch (error) {
        setStatus(`A watched folder could not be read. ${String(error)} Reconnect both folders.`, true);
      }
    }, 350);
  });
  nativeListenerReady = true;
}

async function writeSidecar(demo: boolean): Promise<void> {
  try {
    const [{ open }, { invoke }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/api/core')]);
    const directory = await open({ directory: true, title: 'Choose where to write the sidecar' });
    if (!directory) { setStatus('No sidecar folder was chosen.'); return; }
    const path = await invoke<string>('write_sidecar', { directory, contents: ledgerJson(loadLedger(demo)) });
    setStatus(`New sidecar written to ${path}.`);
  } catch (error) { setStatus(`The sidecar could not be written. ${String(error)} Choose a writable folder.`, true); }
}

function bindLicense(): void {
  document.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const value = new FormData(form).get('license')?.toString().trim() || '';
    const status = document.querySelector<HTMLElement>('#license-status');
    if (!value) { if (status) status.textContent = 'Paste the license token first.'; return; }
    storeLicense(value); if (status) status.textContent = 'Checking this license…';
    license = await verifyLicense(true); if (status) status.textContent = license.message;
  });
}

async function loadDownloads(): Promise<void> {
  const target = document.querySelector<HTMLElement>('#download-state'); if (!target) return;
  const fallback = `<p>Downloads are being published.</p><a class="button" href="https://github.com/B-Divyesh/sf-epub-annotation-bridge/releases">Open the release page <span class="sr-only">(external)</span></a>`;
  try {
    const cache = JSON.parse(localStorage.getItem('epub-bridge:release') || 'null') as { time: number; data: Release } | null;
    let data: Release;
    if (cache && Date.now() - cache.time < 3_600_000) data = cache.data;
    else {
      const response = await fetch('https://api.github.com/repos/B-Divyesh/sf-epub-annotation-bridge/releases?per_page=1');
      if (!response.ok) throw new Error('No release');
      const releases = await response.json() as Release[];
      if (!releases.length) throw new Error('No release');
      data = releases[0];
      localStorage.setItem('epub-bridge:release', JSON.stringify({ time: Date.now(), data }));
    }
    const platform = /Mac/i.test(navigator.userAgent) ? 'macOS' : /Win/i.test(navigator.userAgent) ? 'Windows' : 'Linux';
    const pattern = platform === 'macOS' ? /\.(dmg|app\.tar\.gz)$/i : platform === 'Windows' ? /\.(msi|exe)$/i : /\.(AppImage|deb)$/i;
    const asset = data.assets.find((item) => pattern.test(item.name));
    target.innerHTML = asset ? `<p>${escapeHtml(data.tag_name)} is ready for ${platform}.</p><a class="button primary" href="${escapeHtml(asset.browser_download_url)}">Download for ${platform}</a><a class="text-link" href="${escapeHtml(data.html_url)}">See every platform <span class="sr-only">(external)</span></a>` : fallback;
  } catch { target.innerHTML = fallback; }
}

interface Release { tag_name: string; html_url: string; assets: Array<{ name: string; browser_download_url: string }> }

window.addEventListener('popstate', () => render(true));
window.addEventListener('offline', () => { document.body.dataset.offline = 'true'; routeStatus.textContent = 'You are offline. Saved pages and exports still work.'; });
window.addEventListener('online', () => { delete document.body.dataset.offline; routeStatus.textContent = 'You are back online.'; });

captureLicense();
license = initialLicenseState();
render();
if (license.checking) void verifyLicense().then((state) => { license = state; if (route() === '/download' || route() === '/ledger') render(); });
if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
