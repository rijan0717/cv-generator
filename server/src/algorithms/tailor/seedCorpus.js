/**
 * The seed adverts the rewrite weights terms against.
 *
 * Read here rather than imported from `jobMatcher.js`, which keeps its
 * processed copy private. One file read at startup is a smaller cost
 * than widening that module's surface.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { processText } from '../textProcessor.js';

/**
 * The same seed adverts the match analyser weights against.
 *
 * Read here rather than imported from `jobMatcher.js`, which keeps its
 * processed copy private. Duplicating one file read at module load is a
 * much smaller cost than widening that module's surface — and it is read
 * once, when the process starts, not per request.
 *
 * @type {string[][]}
 */
export const SEED_DOCUMENTS = JSON.parse(
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data/seedJobDescriptions.json'),
    'utf8',
  ),
).map((entry) => processText(entry.text));
