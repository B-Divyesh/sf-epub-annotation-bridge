import { describe, expect, it } from 'vitest';
import { parseKoboCsv, parseKoreaderLua, parseLedgerJson } from '../src/parsers';
import { ledgerJson, ledgerMarkdown } from '../src/exporters';
import { sampleAnnotations } from '../src/sample';

describe('annotation formats', () => {
  it('@claim:annotation-import imports all three supported note formats', () => {
    const lua = parseKoreaderLua(`return { ["title"] = "Walden", ["annotations"] = {
      [1] = { ["chapter"] = "Economy", ["text"] = "A KOReader quote", },
    }, }`, 'metadata.epub.lua');
    const csv = parseKoboCsv('Book Title,Highlight\nWalden,A Kobo quote');
    const json = parseLedgerJson(ledgerJson(sampleAnnotations.slice(0, 1)));
    expect([lua[0].source, csv[0].source, json[0].source]).toEqual(['KOReader', 'Kobo', 'KOReader']);
  });

  it('imports KOReader annotation tables', () => {
    const rows = parseKoreaderLua(`return { ["title"] = "A Room of One's Own", ["authors"] = "Virginia Woolf", ["annotations"] = {
      [1] = { ["chapter"] = "Chapter One", ["text"] = "A woman must have money and a room of her own", ["note"] = "The practical condition", ["datetime"] = "2026-01-03T10:00:00Z", },
    }, }`, 'metadata.epub.lua');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: 'KOReader', title: "A Room of One's Own", chapter: 'Chapter One' });
  });

  it('imports quoted Kobo CSV cells', () => {
    const rows = parseKoboCsv('Book Title,Author,Chapter,Highlight,Annotation,Date\nWalden,Thoreau,Economy,"A quote, with a comma",A note,2026-01-01');
    expect(rows[0].quote).toBe('A quote, with a comma');
    expect(rows[0].source).toBe('Kobo');
  });

  it('round trips the portable ledger without dropping a note', () => {
    expect(parseLedgerJson(ledgerJson(sampleAnnotations))).toHaveLength(sampleAnnotations.length);
    expect(ledgerMarkdown(sampleAnnotations)).toContain(sampleAnnotations[0].note);
  });
});
