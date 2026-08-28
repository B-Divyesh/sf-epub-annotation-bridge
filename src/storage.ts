import type { Annotation, Ledger } from './types';

const REAL_KEY = 'epub-bridge:ledger:v1';
const DEMO_KEY = 'demo:epub-bridge:ledger:v1';

export function loadLedger(demo: boolean): Annotation[] {
  const store = demo ? sessionStorage : localStorage;
  const raw = store.getItem(demo ? DEMO_KEY : REAL_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Ledger;
    return parsed.format === 'epub-annotation-ledger' ? parsed.annotations : [];
  } catch {
    return [];
  }
}

export function saveLedger(demo: boolean, annotations: Annotation[]): void {
  const ledger: Ledger = { format: 'epub-annotation-ledger', version: 1, exportedAt: new Date().toISOString(), annotations };
  (demo ? sessionStorage : localStorage).setItem(demo ? DEMO_KEY : REAL_KEY, JSON.stringify(ledger));
}

export function resetDemo(): void {
  sessionStorage.removeItem(DEMO_KEY);
}

export function leaveDemo(): void {
  resetDemo();
}
