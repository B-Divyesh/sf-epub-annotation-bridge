import type { Annotation, Ledger } from './types';

export function ledgerJson(annotations: Annotation[]): string {
  const ledger: Ledger = {
    format: 'epub-annotation-ledger', version: 1,
    exportedAt: new Date().toISOString(), annotations,
  };
  return `${JSON.stringify(ledger, null, 2)}\n`;
}

function clean(value: string): string {
  return value.replace(/\r?\n/g, ' ').trim();
}

export function ledgerMarkdown(annotations: Annotation[]): string {
  const groups = new Map<string, Annotation[]>();
  for (const annotation of annotations) {
    const key = `${annotation.title}\u0000${annotation.author}`;
    groups.set(key, [...(groups.get(key) ?? []), annotation]);
  }
  const lines = ['# Annotation ledger', ''];
  for (const [key, rows] of groups) {
    const [title, author] = key.split('\u0000');
    lines.push(`## ${clean(title)}`, '', `*${clean(author)}*`, '');
    for (const row of rows) {
      lines.push(`### ${clean(row.chapter || 'Unknown chapter')}`, '', `> ${clean(row.quote)}`, '');
      if (row.note) lines.push(clean(row.note), '');
      lines.push(`- CFI: \`${row.cfi || 'unmatched'}\``, `- Source: ${row.source}`, `- Read: ${row.createdAt}`, '');
    }
  }
  return `${lines.join('\n').trim()}\n`;
}

export function downloadText(filename: string, body: string, type: string): void {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
