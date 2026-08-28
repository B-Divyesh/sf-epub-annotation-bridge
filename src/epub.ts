import { unzipSync, strFromU8 } from 'fflate';
import type { Annotation, BookFile } from './types';

const normal = (value: string) => value.replace(/\s+/g, ' ').trim();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function firstText(doc: Document, names: string[]): string {
  for (const name of names) {
    const node = doc.getElementsByTagName(name)[0] || doc.querySelector(name);
    if (node?.textContent?.trim()) return node.textContent.trim();
  }
  return '';
}

function resolvePath(base: string, relative: string): string {
  const parts = `${base}/${relative}`.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop(); else stack.push(part);
  }
  return stack.join('/');
}

export async function readEpub(file: File): Promise<BookFile & { chapters: Array<{ href: string; label: string; text: string }> }> {
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const xml = new DOMParser();
  const container = xml.parseFromString(strFromU8(zip['META-INF/container.xml']), 'application/xml');
  const packagePath = container.querySelector('rootfile')?.getAttribute('full-path');
  if (!packagePath || !zip[packagePath]) throw new Error(`${file.name} has no readable EPUB package file.`);
  const opf = xml.parseFromString(strFromU8(zip[packagePath]), 'application/xml');
  const base = packagePath.split('/').slice(0, -1).join('/');
  const title = firstText(opf, ['dc:title', 'title']) || file.name.replace(/\.epub$/i, '');
  const author = firstText(opf, ['dc:creator', 'creator']) || 'Unknown author';
  const manifest = new Map([...opf.querySelectorAll('manifest item')].map((item) => [item.getAttribute('id') || '', item.getAttribute('href') || '']));
  const chapters = [...opf.querySelectorAll('spine itemref')].map((item, index) => {
    const href = resolvePath(base, manifest.get(item.getAttribute('idref') || '') || '');
    const bytes = zip[href];
    if (!bytes) return null;
    const doc = xml.parseFromString(strFromU8(bytes), 'application/xhtml+xml');
    const heading = doc.querySelector('h1,h2,h3,title')?.textContent || `Section ${index + 1}`;
    return { href, label: normal(heading), text: normal(doc.body?.textContent || doc.documentElement.textContent || '') };
  }).filter((item): item is { href: string; label: string; text: string } => Boolean(item));
  return { id: `${file.name}:${file.size}`, title, author, file, chapters };
}

export async function matchAnnotations(annotations: Annotation[], books: BookFile[]): Promise<Annotation[]> {
  const parsed = await Promise.all(books.map((book) => readEpub(book.file)));
  return annotations.map((row) => {
    if (row.cfi) return row;
    const book = parsed.find((candidate) => normal(candidate.title).toLowerCase() === normal(row.title).toLowerCase())
      || parsed.find((candidate) => normal(candidate.title).toLowerCase().includes(normal(row.title).toLowerCase()));
    if (!book) return row;
    const quote = normal(row.quote);
    const chapterIndex = book.chapters.findIndex((chapter) => chapter.text.includes(quote));
    if (chapterIndex < 0) return { ...row, bookId: book.id };
    const chapter = book.chapters[chapterIndex];
    const offset = Math.max(0, chapter.text.search(new RegExp(escapeRegExp(quote.slice(0, 80)), 'i')));
    return {
      ...row, bookId: book.id, title: book.title, author: book.author,
      chapter: row.chapter === 'Unknown chapter' ? chapter.label : row.chapter,
      cfi: `epubcfi(/6/${(chapterIndex + 1) * 2}!/4/1:${offset})`, match: 'quote',
    };
  });
}
