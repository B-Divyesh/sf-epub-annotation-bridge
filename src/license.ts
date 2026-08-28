const KEY = 'sb_license:epub-annotation-bridge';
const CACHE_KEY = `${KEY}:verdict`;
const API = 'https://api.sociobot.in/api/v1/products/epub-annotation-bridge';

export interface LicenseState { unlocked: boolean; checking: boolean; message: string; }

function cachedVerdict(): { valid: boolean; checkedAt: number } | null {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as { valid?: unknown; checkedAt?: unknown } | null;
    return value && typeof value.valid === 'boolean' && typeof value.checkedAt === 'number'
      ? { valid: value.valid, checkedAt: value.checkedAt }
      : null;
  } catch {
    return null;
  }
}

export function initialLicenseState(): LicenseState {
  const cached = cachedVerdict();
  return {
    unlocked: Boolean(storedLicense() && cached?.valid),
    checking: Boolean(storedLicense()),
    message: cached?.valid ? 'License active' : '',
  };
}

export function captureLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(KEY, token);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function storedLicense(): string { return localStorage.getItem(KEY) || ''; }

export function storeLicense(token: string): void {
  localStorage.setItem(KEY, token.trim());
  localStorage.removeItem(CACHE_KEY);
}

export async function verifyLicense(force = false): Promise<LicenseState> {
  const token = storedLicense();
  if (!token) return { unlocked: false, checking: false, message: '' };
  const cached = cachedVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) {
    return { unlocked: cached.valid, checking: false, message: cached.valid ? 'License active' : 'License no longer active' };
  }
  try {
    const response = await fetch(`${API}/verify?license=${encodeURIComponent(token)}`);
    const result = await response.json() as { valid: boolean };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: result.valid, checkedAt: Date.now() }));
    return { unlocked: result.valid, checking: false, message: result.valid ? 'License active' : 'License no longer active' };
  } catch {
    return { unlocked: cached?.valid ?? false, checking: false, message: cached?.valid ? 'License active offline' : 'License check needs a connection' };
  }
}

export const checkoutUrl = `${API}/checkout`;
