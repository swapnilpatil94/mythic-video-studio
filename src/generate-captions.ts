import {mkdir, readFile, writeFile} from 'node:fs/promises';
import type {ProductionManifest} from './pipeline/types';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = JSON.parse(await readFile(input, 'utf8')) as ProductionManifest;

const formatTime = (seconds: number) => {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

let cursor = 0;
const entries = manifest.beats
  .map((beat, index) => {
    const start = cursor;
    cursor += beat.duration_seconds;
    const text = (beat.narration ?? beat.text ?? '').trim();
    return text ? {index: index + 1, start, end: cursor, text} : null;
  })
  .filter((entry): entry is {index: number; start: number; end: number; text: string} => Boolean(entry));

const srt = entries
  .map((entry) => `${entry.index}\n${formatTime(entry.start)} --> ${formatTime(entry.end)}\n${entry.text}\n`)
  .join('\n');

const vtt = `WEBVTT\n\n${entries
  .map((entry) => `${formatTime(entry.start).replace(',', '.')} --> ${formatTime(entry.end).replace(',', '.')}\n${entry.text}\n`)
  .join('\n')}`;

const dir = `projects/${manifest.project_id}/captions`;
await mkdir(dir, {recursive: true});
await writeFile(`${dir}/narration.srt`, srt, 'utf8');
await writeFile(`${dir}/narration.vtt`, vtt, 'utf8');
await writeFile(`${dir}/captions-report.json`, JSON.stringify({project_id: manifest.project_id, entries: entries.length, source: 'beat narration/text', generated_at: new Date().toISOString()}, null, 2), 'utf8');

console.log(`PASS: generated ${entries.length} caption entries`);
console.log(`SRT: ${dir}/narration.srt`);
console.log(`VTT: ${dir}/narration.vtt`);
