export type SourceKind = 'KOReader' | 'Kobo' | 'Ledger';

export interface Annotation {
  id: string;
  bookId: string;
  title: string;
  author: string;
  chapter: string;
  quote: string;
  note: string;
  cfi: string;
  createdAt: string;
  source: SourceKind;
  match: 'exact' | 'quote' | 'unmatched';
}

export interface Ledger {
  format: 'epub-annotation-ledger';
  version: 1;
  exportedAt: string;
  annotations: Annotation[];
}

export interface BookFile {
  id: string;
  title: string;
  author: string;
  file: File;
}

export interface NativeScan {
  books: Array<{ id: string; title: string; author: string; path: string }>;
  annotationFiles: Array<{ path: string; name: string; content: string }>;
  annotations: Annotation[];
}
