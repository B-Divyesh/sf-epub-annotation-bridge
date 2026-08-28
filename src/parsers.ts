import type { Annotation, Ledger, SourceKind } from './types';

const hash = (text: string): string => {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return (value >>> 0).toString(36);
};

const strip = (value = '') => value.trim().replace(/^['"]|['"]$/g, '');
const field = (block: string, name: string): string => {
  const match = block.match(new RegExp(`\\[?['"]?${name}['"]?\\]?\\s*=\\s*(["'])([\\s\\S]*?)\\1\\s*,?`, 'i'));
  return match ? match[2].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
};

function annotation(input: Partial<Annotation> & { quote: string; source: SourceKind }): Annotation {
  const title = input.title || 'Unknown EPUB';
  const chapter = input.chapter || 'Unknown chapter';
  const quote = input.quote.trim();
  return {
    id: input.id || hash(`${title}|${chapter}|${quote}|${input.createdAt || ''}`),
    bookId: input.bookId || hash(`${title}|${input.author || ''}`), title,
    author: input.author || 'Unknown author', chapter, quote, note: input.note || '',
    cfi: input.cfi || '', createdAt: input.createdAt || new Date(0).toISOString(),
    source: input.source, match: input.cfi ? 'exact' : 'unmatched',
  };
}

export function parseLedgerJson(raw: string): Annotation[] {
  const parsed = JSON.parse(raw) as Ledger | Annotation[];
  const rows = Array.isArray(parsed) ? parsed : parsed.annotations;
  if (!Array.isArray(rows)) throw new Error('This JSON file has no annotations list. Export a ledger JSON file and try again.');
  return rows.filter((row) => typeof row.quote === 'string').map((row) => annotation({ ...row, source: row.source || 'Ledger' }));
}

export function parseKoreaderLua(raw: string, filename: string): Annotation[] {
  const title = field(raw, 'title') || filename.replace(/\.(sdr\/)?metadata\.epub\.lua$|\.lua$/i, '').replace(/[-_]/g, ' ');
  const author = field(raw, 'authors') || field(raw, 'author');
  const section = raw.match(/\["annotations"\]\s*=\s*\{([\s\S]*?)\n\s*\},?\s*\n\s*\[/)?.[1] ?? raw;
  const blocks = [...section.matchAll(/\[\d+\]\s*=\s*\{([\s\S]*?)\n\s*\},?/g)].map((match) => match[1]);
  const rows = blocks.map((block) => annotation({
    title, author, chapter: field(block, 'chapter'), quote: field(block, 'text'),
    note: field(block, 'note'), cfi: field(block, 'cfi'),
    createdAt: field(block, 'datetime') || field(block, 'time'), source: 'KOReader',
  })).filter((row) => row.quote);
  if (!rows.length) throw new Error('No KOReader highlights were found. Choose the book metadata.lua file inside its .sdr folder.');
  return rows;
}

function csvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (char === '"' && quoted && raw[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && raw[i + 1] === '\n') i += 1;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  row.push(cell); if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseKoboCsv(raw: string): Annotation[] {
  const rows = csvRows(raw);
  const headers = rows.shift()?.map((value) => value.trim().toLowerCase()) ?? [];
  const index = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const at = (row: string[], ...names: string[]) => row[index(...names)] || '';
  const parsed = rows.map((row) => annotation({
    title: at(row, 'title', 'book title'), author: at(row, 'author'), chapter: at(row, 'chapter', 'chapter title'),
    quote: at(row, 'highlight', 'text', 'quote'), note: at(row, 'annotation', 'note'),
    cfi: at(row, 'cfi'), createdAt: at(row, 'date', 'created', 'date created'), source: 'Kobo',
  })).filter((item) => item.quote);
  if (!parsed.length) throw new Error('No Kobo highlights were found. Export a CSV with a Highlight or Text column.');
  return parsed;
}

export function parseAnnotationFile(name: string, raw: string): Annotation[] {
  if (name.toLowerCase().endsWith('.json')) return parseLedgerJson(raw);
  if (name.toLowerCase().endsWith('.lua')) return parseKoreaderLua(raw, name);
  if (name.toLowerCase().endsWith('.csv')) return parseKoboCsv(raw);
  throw new Error('This file type is not supported. Choose KOReader Lua, Kobo CSV, or ledger JSON.');
}
