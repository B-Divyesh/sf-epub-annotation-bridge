import type { Annotation } from './types';

export const sampleAnnotations: Annotation[] = [
  {
    id: 'walden-1', bookId: 'walden-thoreau', title: 'Walden', author: 'Henry David Thoreau',
    chapter: 'Economy', quote: 'The mass of men lead lives of quiet desperation.',
    note: 'A sentence that keeps changing as the reader changes.',
    cfi: 'epubcfi(/6/4!/4/22/1:31)', createdAt: '2026-07-16T20:14:00Z', source: 'KOReader', match: 'exact',
  },
  {
    id: 'walden-2', bookId: 'walden-thoreau', title: 'Walden', author: 'Henry David Thoreau',
    chapter: 'Where I Lived, and What I Lived For', quote: 'I went to the woods because I wished to live deliberately.',
    note: '', cfi: 'epubcfi(/6/10!/4/8/1:0)', createdAt: '2026-07-18T07:42:00Z', source: 'Kobo', match: 'quote',
  },
  {
    id: 'pride-1', bookId: 'pride-austen', title: 'Pride and Prejudice', author: 'Jane Austen',
    chapter: 'Chapter 1', quote: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
    note: 'Opening as social trap.', cfi: 'epubcfi(/6/6!/4/4/1:0)', createdAt: '2026-08-02T16:03:00Z', source: 'KOReader', match: 'exact',
  },
  {
    id: 'pride-2', bookId: 'pride-austen', title: 'Pride and Prejudice', author: 'Jane Austen',
    chapter: 'Chapter 34', quote: 'In vain I have struggled. It will not do.', note: 'The shortest failed defense.',
    cfi: 'epubcfi(/6/72!/4/12/1:4)', createdAt: '2026-08-08T21:11:00Z', source: 'Kobo', match: 'quote',
  },
  {
    id: 'frankenstein-1', bookId: 'frankenstein-shelley', title: 'Frankenstein', author: 'Mary Shelley',
    chapter: 'Letter 4', quote: 'I have no friend, Margaret: when I am glowing with the enthusiasm of success, there will be none to participate my joy.',
    note: '', cfi: 'epubcfi(/6/8!/4/18/1:7)', createdAt: '2026-08-19T19:24:00Z', source: 'KOReader', match: 'exact',
  },
];
