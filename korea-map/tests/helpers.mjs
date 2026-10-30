// 시험에서 함께 쓰는 자료 읽기 도우미
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

export function loadAll() {
  return {
    sido: readJson('data/geo/sido.json'),
    rivers: readJson('data/geo/rivers.json'),
    regions: readJson('data/regions.json'),
    cities: readJson('data/cities.json'),
    places: readJson('data/places.json'),
    nature: readJson('data/nature.json'),
  };
}
