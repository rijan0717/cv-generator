/**
 * Action verbs used by the CV Strength Score.
 *
 * A bullet that begins "Responsible for the testing of…" describes a duty;
 * one that begins "Tested…" describes something the person did. Recruiters
 * and CV guidance both favour the second, so the scorer rewards it.
 *
 * Stored as base forms. The scorer matches a word if it equals a base form
 * or is that form plus a regular ending, which is why "Led", "Leading" and
 * "Leads" all count without listing each one.
 */

/** @type {Set<string>} */
export const ACTION_VERBS = new Set([
  // Leadership and ownership
  'lead',
  'led',
  'manage',
  'direct',
  'head',
  'oversee',
  'supervise',
  'coordinate',
  'own',
  'drive',
  'spearhead',
  'chair',
  'mentor',
  'coach',
  'guide',
  'delegate',
  'organise',
  'organize',

  // Building and creating
  'build',
  'built',
  'create',
  'develop',
  'design',
  'implement',
  'engineer',
  'architect',
  'construct',
  'establish',
  'found',
  'launch',
  'introduce',
  'initiate',
  'produce',
  'author',
  'write',
  'compose',
  'prototype',
  'configure',
  'deploy',
  'integrate',
  'migrate',
  'automate',

  // Improving
  'improve',
  'enhance',
  'optimise',
  'optimize',
  'increase',
  'reduce',
  'cut',
  'accelerate',
  'streamline',
  'simplify',
  'refactor',
  'modernise',
  'modernize',
  'upgrade',
  'strengthen',
  'expand',
  'grow',
  'boost',
  'maximise',
  'maximize',
  'minimise',
  'minimize',
  'eliminate',
  'resolve',
  'fix',
  'debug',
  'troubleshoot',
  'restore',
  'transform',
  'redesign',

  // Analysis
  'analyse',
  'analyze',
  'assess',
  'evaluate',
  'research',
  'investigate',
  'audit',
  'review',
  'measure',
  'monitor',
  'track',
  'forecast',
  'model',
  'diagnose',
  'identify',
  'determine',
  'validate',
  'verify',
  'test',
  'benchmark',
  'quantify',

  // Delivery
  'deliver',
  'complete',
  'achieve',
  'attain',
  'exceed',
  'surpass',
  'execute',
  'perform',
  'conduct',
  'run',
  'operate',
  'maintain',
  'administer',
  'process',
  'handle',
  'support',
  'resolve',
  'ship',
  'release',

  // Communication
  'present',
  'communicate',
  'report',
  'document',
  'advise',
  'consult',
  'negotiate',
  'persuade',
  'influence',
  'collaborate',
  'partner',
  'liaise',
  'facilitate',
  'train',
  'teach',
  'instruct',
  'demonstrate',
  'promote',
  'recommend',
  'propose',
  'pitch',

  // Planning
  'plan',
  'schedule',
  'prioritise',
  'prioritize',
  'budget',
  'allocate',
  'forecast',
  'strategise',
  'strategize',
  'define',
  'scope',
  'estimate',
]);

/** Regular endings that still count as the same verb. */
const SUFFIXES = ['s', 'ed', 'd', 'ing'];

/**
 * Reports whether a word is an action verb, allowing for regular endings.
 *
 * @param {string} word - A single word, any case.
 * @returns {boolean} True when the word is an action verb.
 */
export function isActionVerb(word) {
  if (!word) return false;

  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!lower) return false;

  if (ACTION_VERBS.has(lower)) return true;

  for (const suffix of SUFFIXES) {
    if (!lower.endsWith(suffix)) continue;

    const stem = lower.slice(0, -suffix.length);
    if (ACTION_VERBS.has(stem)) return true;

    // "planned" -> "plann" -> "plan": undo a doubled final consonant.
    if (stem.length > 2 && stem.at(-1) === stem.at(-2) && ACTION_VERBS.has(stem.slice(0, -1))) {
      return true;
    }

    // "simplified" -> "simplifi" -> "simplify": undo y -> i.
    if (stem.endsWith('i') && ACTION_VERBS.has(`${stem.slice(0, -1)}y`)) return true;
  }

  return false;
}

export default ACTION_VERBS;
