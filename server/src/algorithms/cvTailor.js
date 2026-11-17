/**
 * Job-Tailored CV Rewrite.
 *
 * The user has one CV they keep up to date. A particular advert asks for
 * a particular slice of it. This module produces a *draft* second CV that
 * puts that slice first, in the advert's own vocabulary — which is what
 * "tailoring a CV" means when a careers adviser says it, and what an
 * applicant tracking system is actually measuring when it ranks you.
 *
 * It is our own code throughout. No language model is involved, and that
 * constraint shapes the whole design: a program that cannot write English
 * must not pretend to. So the rewrite is built from four operations that
 * are honest without being creative:
 *
 *   1. **Re-ordering.** Put the most relevant achievements, projects,
 *      skills and sections first. Nothing is invented; the same facts are
 *      read in a different order.
 *   2. **Re-wording.** Promote the verb the user already wrote to the
 *      front of the line ("Responsible for managing X" -> "Managed X").
 *      Handled by `phraseRewriter.js`, which refuses to rewrite whenever
 *      the verb would have to come from somewhere other than the user.
 *   3. **Re-spelling.** Where the CV and the advert name the same skill
 *      differently, use the advert's spelling ("JS" -> "JavaScript").
 *      Only ever between aliases of one dictionary entry, so it cannot
 *      change what a sentence means.
 *   4. **Assembling.** Build a professional summary out of facts the CV
 *      already states — job title, years, skills, one quantified result,
 *      highest qualification — joined by fixed connecting phrases.
 *
 * Where it cannot act honestly it says so instead. A bullet with no verb
 * to promote, and a role that quantifies nothing, come back as advice in
 * `notes` rather than as a change — the module will not choose a verb or
 * invent a figure on the user's behalf.
 *
 * A skill the advert asks for and the CV proves *somewhere* (described in
 * a role but missing from the skills list) is added, because the evidence
 * is the user's own. A skill with no evidence at all is only ever
 * *suggested*, and the user decides.
 *
 * The one exception is the target pass (step 8, `reachTarget`). The
 * feature aims to produce a CV that clears a `targetScore` match, and on
 * a CV that the honest steps leave short of it, the only levers left are
 * to list skills the CV cannot evidence and to name the advert's own
 * words in the summary. It uses them — the fewest that get over the
 * line, re-scoring as it goes. They come back under `assumedSkills` and
 * `focusTerms` rather than mixed in with the rest, and the review screen
 * labels every one as an assumption for the user to confirm or delete.
 *
 * How far that pass may go is governed by `fieldFit`: full strength on a
 * CV in the advert's own field, half on a neighbouring one, and nothing
 * at all on an advert from a different field, where the rewrite reports
 * what the honest steps reached and says plainly why it stopped. The
 * target is a ceiling on effort, not a promise — a score that can always
 * be reached would measure nothing.
 *
 * Two numbers come back for that reason. `honestScore` is what the
 * re-ordering, re-wording and evidenced skills reached on their own;
 * `matchScore` is what the draft scores with the assumptions included.
 * The user sees both, so what the assumptions are worth is visible
 * rather than implied.
 *
 * Nothing here touches the database and nothing here is saved. The caller
 * returns the draft to the user, who edits it and then chooses to keep it
 * as a new CV.
 *
 * "Relevance" throughout means one thing: the share of the advert's
 * highest-weighted TF-IDF vocabulary that a piece of text covers. The
 * weighting is the same `tfidf.js` the match analyser uses, so a change
 * the tailor makes and the score the analyser reports cannot disagree
 * about what this advert is asking for.
 */

import { TAILOR_CONFIG } from '../config/scoringConfig.js';
import { analyseMatch } from './jobMatcher.js';
import { hasQuantifiedResult } from './cvStrengthScorer.js';

import { buildJobProfile, relevanceOf, rankByRelevance, orderChanged } from './tailor/relevance.js';
import {
  yearsOfExperience,
  buildSummary,
  softenTitle,
  fieldFit,
  withArticle,
} from './tailor/summary.js';
import {
  buildVocabularyMap,
  alignVocabulary,
  polishLine,
  polishDescription,
} from './tailor/vocabulary.js';
import { tailorSkills, canonicalOf } from './tailor/skills.js';
import {
  advertVocabulary,
  focusSentence,
  withFocusSentence,
  withoutFocusSentence,
} from './tailor/focus.js';
import { orderSections, fillPage } from './tailor/layout.js';

// Re-exported so this module's public surface is unchanged by the split.
export {
  buildJobProfile,
  relevanceOf,
  yearsOfExperience,
  buildSummary,
  softenTitle,
  fieldFit,
  withArticle,
  buildVocabularyMap,
  alignVocabulary,
  tailorSkills,
};

/** Sections the draft copies across unchanged, in CV order. */
const CARRIED_FIELDS = [
  'templateKey',
  'personal',
  'education',
  'certifications',
  'languages',
  'references',
  'referencesOnRequest',
];

// --- Relevance -------------------------------------------------------------

/**
 * Produces a tailored draft of one CV for one advert.
 *
 * The eight steps, in order:
 *
 *   1. Weight the advert, giving the relevance yardstick.
 *   2. Point the headline at the advertised role.
 *   3. Re-order and extend the skills section (see `tailorSkills`).
 *   4. Re-word experience so each line opens with a verb and names each
 *      skill the advert's way, and put each role's most relevant
 *      achievements first.
 *   5. Do the same for projects, and order the projects themselves by
 *      relevance — unlike roles, projects have no expected order.
 *   6. Assemble a summary from facts already on the CV.
 *   7. Order the sections so the most relevant one is read first.
 *   8. Score the draft, and if it falls short of the target, add the
 *      fewest unevidenced skills that clear it (see `reachTarget`).
 *
 * Experience entries are never re-ordered. A CV is read in reverse
 * chronological order and a reader uses that to judge a career; shuffling
 * roles by keyword would make a recent job look like an old one. Only the
 * achievements *within* a role move.
 *
 * @param {object} cv - The CV to tailor. Not modified.
 * @param {string} jobText - The advert.
 * @param {{jobTitle?: string, priorJobDescriptions?: string[]}} [options]
 * @returns {{draft: object, changes: Array<object>, suggestedSkills: string[],
 *            notes: string[]}}
 */
export function tailorCV(cv, jobText, options = {}) {
  const { jobTitle = '', priorJobDescriptions = [] } = options;

  // --- Step 1: the yardstick ---------------------------------------------
  const profile = buildJobProfile(jobText, priorJobDescriptions);

  const changes = [];
  const notes = [];

  /**
   * Records one change for the review screen.
   * @param {object} change - What changed, and why.
   */
  const record = (change) => changes.push(change);

  // `toObject` is present on a Mongoose document and absent on the plain
  // object the tests and the upload flow pass in.
  const source = typeof cv?.toObject === 'function' ? cv.toObject() : { ...cv };

  // A CV saved from an earlier rewrite still carries the alignment
  // sentence the target pass wrote. It is this module's writing, not the
  // user's, so it is taken off before anything is measured: left on, it
  // would count as evidence that the CV already speaks the advert's
  // language, and re-tailoring the same draft against the same advert
  // would ratchet the score up a little further every time it ran.
  source.summary = withoutFocusSentence(source.summary);

  const draft = {};
  for (const field of CARRIED_FIELDS) draft[field] = source[field];
  draft.settings = { ...(source.settings ?? {}) };
  draft.personal = { ...(source.personal ?? {}) };

  // --- Step 2: the headline ----------------------------------------------
  // The advert's title, minus any seniority word the CV does not support
  // ("Senior QA Engineer" -> "QA Engineer" for someone with no senior role).
  const headline = softenTitle(jobTitle, source);

  // How far this CV is from the advert, which decides both how far the
  // headline may go here and how far the target pass may go in step 8.
  const fit = fieldFit(source, headline.title, profile);

  // The headline is a claim about who the person is, and the first line
  // a screening system reads. Taking the advert's title is the cheapest
  // way to match it — but only where the CV supports the claim. On a CV
  // from another field it produced documents headlined "Accountant"
  // whose own summary, which is guarded, went on to say "React
  // Developer": the rewrite contradicting itself on the first two lines.
  // Their own headline stays, and the advert's title still appears in
  // the closing sentence of the summary as the role applied for.
  //
  // A CV with no headline and no job titles on it has nothing to
  // contradict, so the advert's title is used there.
  const ownTitle = source.personal?.headline?.trim() || source.experience?.[0]?.position?.trim();
  const headlineSupported = fit.sharesTitle || !ownTitle;

  if (headline.title && !headlineSupported) {
    notes.push(
      `The headline was left as "${ownTitle}". This advert is for ${withArticle(headline.title)}, ` +
        'which none of your job titles supports — and a headline your own summary and ' +
        'experience go on to contradict is worse than one that does not match the advert. ' +
        'Change it yourself if the two roles are closer than they read.',
    );
  }

  if (headline.title && headlineSupported && draft.personal.headline !== headline.title) {
    record({
      section: 'personal',
      field: 'headline',
      kind: 'replaced',
      before: draft.personal.headline ?? '',
      after: headline.title,
      reason:
        'The headline is the first line a screening system reads. Matching it to the ' +
        'advertised job title is the single cheapest thing you can change.' +
        (headline.removed.length > 0
          ? ` "${headline.removed.join(' ')}" was left out, because no role on your CV ` +
            'shows that level yet — a claim you would have to defend at interview.'
          : ''),
    });
    draft.personal.headline = headline.title;
  }

  // --- Step 3: skills -----------------------------------------------------
  const skillResult = tailorSkills(source, jobText);
  draft.skills = skillResult.skills;

  if (skillResult.promoted.length > 0 && (source.skills ?? []).length > 1) {
    record({
      section: 'skills',
      kind: 'reordered',
      after: skillResult.promoted.join(', '),
      reason: 'Moved the skills this advert asks for to the front of the section.',
    });
  }

  for (const name of skillResult.added) {
    record({
      section: 'skills',
      kind: 'added',
      after: name,
      reason:
        `This advert asks for ${name}, and your CV describes it elsewhere but does not ` +
        'list it. Added so a screening system reading only the skills section can see it.',
    });
  }

  // --- Step 4: experience -------------------------------------------------
  const vocabulary = buildVocabularyMap(jobText);

  draft.experience = (source.experience ?? []).map((entry) => {
    const role = { ...entry };
    const present = Boolean(entry.isCurrent);
    const label = entry.position || 'A role';

    const rewritten = polishDescription(entry.description, vocabulary, { present });
    if (rewritten.changed) {
      record({
        section: 'experience',
        field: `${entry.position || 'Role'} — description`,
        kind: 'reworded',
        before: entry.description,
        after: rewritten.text,
        reason: rewritten.reasons.join(' '),
      });
      role.description = rewritten.text;
    } else if (rewritten.refusal) {
      notes.push(`${label}: ${rewritten.refusal}`);
    }

    // Where the advert cannot separate two achievements, the one with a
    // number in it goes first.
    const rankedAchievements = rankByRelevance(
      entry.achievements ?? [],
      (text) => text,
      profile,
      (text) => (hasQuantifiedResult(text) ? 1 : 0),
    );

    role.achievements = rankedAchievements.map(({ item }) => {
      const result = polishLine(item, vocabulary, { present });
      if (result.changed) {
        record({
          section: 'experience',
          field: `${entry.position || 'Role'} — achievement`,
          kind: 'reworded',
          before: item,
          after: result.text,
          reason: result.reasons.join(' '),
        });
      } else if (result.refusal) {
        notes.push(`${label}: ${result.refusal}`);
      }
      return result.text;
    });

    // The rewriter will not invent a figure, so a role that quantifies
    // nothing is reported rather than fixed. This is the single biggest
    // thing the user can do to the CV themselves, and the strength
    // scorer already weights it heavily.
    const quantifies = [role.description, ...role.achievements].some((text) =>
      hasQuantifiedResult(text),
    );

    if (!quantifies && (role.description || role.achievements.length > 0)) {
      notes.push(
        `${label}: nothing here is quantified. Add a number — how many, how much, how often, ` +
          'how much faster. A figure you put in yourself is the strongest line on any CV.',
      );
    }

    if (orderChanged(rankedAchievements)) {
      record({
        section: 'experience',
        field: entry.position || 'Role',
        kind: 'reordered',
        reason:
          'Put the achievements closest to this advert first, so the relevant ones are ' +
          'read before a recruiter stops reading.',
      });
    }

    return role;
  });

  // --- Step 5: projects ---------------------------------------------------
  const rankedProjects = rankByRelevance(
    source.projects ?? [],
    (project) =>
      [project?.name, project?.role, project?.description, ...(project?.technologies ?? [])]
        .filter(Boolean)
        .join(' '),
    profile,
  );

  draft.projects = rankedProjects.map(({ item }) => {
    const project = { ...item };
    const rewritten = polishDescription(item.description, vocabulary);

    if (rewritten.changed) {
      record({
        section: 'projects',
        field: item.name || 'Project',
        kind: 'reworded',
        before: item.description,
        after: rewritten.text,
        reason: rewritten.reasons.join(' '),
      });
      project.description = rewritten.text;
    } else if (rewritten.refusal) {
      notes.push(`${item.name || 'A project'}: ${rewritten.refusal}`);
    }

    return project;
  });

  if (orderChanged(rankedProjects)) {
    record({
      section: 'projects',
      kind: 'reordered',
      after: rankedProjects
        .map(({ item }) => item.name)
        .filter(Boolean)
        .join(', '),
      reason: 'Projects have no expected order, so the ones closest to this advert come first.',
    });
  }

  // --- Step 6: the summary ------------------------------------------------
  // Named in the order the summary should name them: the advert's skills
  // first, then the user's strongest remaining ones.
  const alreadyNamed = new Set([...skillResult.promoted, ...skillResult.added]);

  // The user's own spelling is used wherever they have one, so a CV that
  // lists "MS Excel" is not described as having both "MS Excel" and
  // "Excel".
  const ownSkills = (source.skills ?? []).filter((skill) => skill?.name);
  const ownSpelling = (name) =>
    ownSkills.find((skill) => canonicalOf(skill) === name)?.name ?? name;

  const namedSkills = [
    ...skillResult.promoted.map(ownSpelling),
    ...skillResult.added,
    ...ownSkills
      .filter((skill) => !alreadyNamed.has(canonicalOf(skill)))
      .map((skill) => skill.name),
  ];

  // The summary's opening sentence states years of experience, so it must
  // name a role the person has actually held. The advert's title is used
  // only when the CV's own titles share a word with it ("QA Engineer" for
  // someone who was a "Junior QA Engineer"); otherwise their own title is
  // used and the advert's title appears only as the role being applied for.
  const summaryContext = {
    targetTitle: fit.sharesTitle
      ? headline.title
      : source.personal?.headline || source.experience?.[0]?.position || headline.title,
    appliedRole: jobTitle,
    namedSkills,
  };
  const summary = buildSummary(source, summaryContext);

  if (summary.text && summary.text !== source.summary) {
    record({
      section: 'summary',
      kind: 'replaced',
      before: source.summary ?? '',
      after: summary.text,
      reason:
        'Rebuilt from facts already on your CV — your dates, your skills, your own ' +
        'quantified achievement — in the language of this advert. Read it before you ' +
        'save it: it is a draft, not a finished paragraph.',
    });
  }

  draft.summary = summary.text || (source.summary ?? '');

  if (summary.short) {
    notes.push(
      `The generated summary is under ${TAILOR_CONFIG.summary.minWords} words, because ` +
        'there was not enough on your CV to build a longer one honestly. Add a sentence ' +
        'or two of your own.',
    );
  }

  // --- Step 7: section order ----------------------------------------------
  draft.settings.sectionOrder = orderSections(source, draft, profile, record);

  // --- Step 8: reach the target score -------------------------------------
  const target = reachTarget(draft, jobText, skillResult.suggested, {
    priorJobDescriptions,
    profile,
    fit,
    record,
    // The *source* CV decides whether there is anything to tailor. By
    // this point the draft always has a summary, because step 6 built
    // one out of the job title alone — so asking the draft would answer
    // "yes" for a completely empty CV.
    source,
  });

  if (!target.reached && fit.level === 'different') {
    // Said first and said plainly. A user who has pasted an advert from
    // another field is better served by being told so than by a draft
    // that reports a number it could only reach by claiming things the
    // CV cannot back up.
    notes.push(
      `This advert is from a different field to your CV: it shares almost none of its ` +
        `vocabulary with anything you have written. The rewrite has re-ordered and re-worded ` +
        `what is there and reached ${target.score}%, and it has stopped at that rather than ` +
        "assume skills you have never mentioned or paste the advert's words into your " +
        'summary. If you have done this kind of work, add it to a role or a project and run ' +
        'the rewrite again — it has nothing else to work from.',
    );
  } else if (!target.reached) {
    notes.push(
      `The best honest match for this advert is ${target.score}%, short of the ` +
        `${TAILOR_CONFIG.targetScore}% target. The score weighs how much your CV *reads* like ` +
        'the advert as well as which skills it names, and listing more skills cannot fix the ' +
        'first of those. Describing this kind of work in your own roles is what closes it.',
    );
  }

  // --- Step 9: fill the page ----------------------------------------------
  // Last, because it measures the finished draft: run any earlier and it
  // would be sizing a document the target pass had not written yet.
  const pageFill = fillPage(draft, { source, summaryContext, record, notes });

  return {
    draft,
    changes,
    suggestedSkills: target.stillSuggested,
    assumedSkills: target.assumed,
    focusTerms: target.focus,
    matchScore: target.score,

    // What the draft scored on the honest steps alone, before the target
    // pass assumed anything. The difference between the two is exactly
    // what the user gives up by deleting the assumptions, and the review
    // screen shows both so that trade is visible rather than implied.
    honestScore: target.honestScore,

    fieldFit: { level: fit.level, overlap: fit.overlap, sharesTitle: fit.sharesTitle },
    targetReached: target.reached,
    pageFill,
    notes,
  };
}

/**
 * Whether there is enough on a CV for tailoring to mean anything.
 *
 * An empty CV scores zero against every advert, so the target pass
 * would bolt its full allowance of assumed skills onto a document with
 * no experience, no summary and nothing else in it. That is not a
 * tailored CV, it is a list of the advert's requirements — and it would
 * be the one case where the feature produced something entirely
 * unsupported by the user.
 *
 * It is asked of the **source** CV, never the draft: by the time the
 * target pass runs, step 6 has given the draft a summary built out of
 * the job title alone, so the draft of a completely empty CV would
 * answer "yes".
 *
 * @param {object} source - The CV the rewrite started from.
 * @returns {boolean} True when there is something to tailor.
 */
function hasContentToTailor(source) {
  return Boolean(
    source?.summary?.trim() ||
    source?.experience?.length ||
    source?.projects?.length ||
    source?.skills?.length,
  );
}

/**
 * Adds the fewest unevidenced skills needed to clear the target score.
 *
 * This is the one place the rewrite states something the CV does not
 * support, so it is deliberately the smallest and loudest part of the
 * module:
 *
 *   - **Smallest.** Skills are added one at a time, the draft is
 *     re-scored after each, and the loop stops the instant the target is
 *     reached. A CV already over the line gets nothing added at all,
 *     which on a CV in the right field is the usual outcome — the honest
 *     steps are normally worth more than this one.
 *   - **Loudest.** What it adds comes back as `assumed`, separately from
 *     everything else, and the review screen labels each one as an
 *     assumption for the user to confirm or remove. Removing one lowers
 *     the score again, which is the behaviour that keeps the number
 *     meaningful.
 *
 * The advert's most heavily weighted skills are tried first, so if only
 * one is needed it is the one the advert cares most about.
 *
 * **The target is not always reachable, and the pass does not pretend
 * otherwise.** The match score weighs how much the CV *reads* like the
 * advert (scaled cosine similarity, 45%) as well as which skills it
 * names (coverage, 55%), so a CV from another field can cover every
 * named skill and still sit in the seventies — listing skills cannot
 * make a shop CV read like a backend advert. When the queue runs out
 * below the target the pass stops, reports `reached: false`, and the
 * caller tells the user why. Inventing experience to close that gap is
 * the one thing this module will not do.
 *
 * Scoring uses `analyseMatch` — the same analyser the match page uses —
 * rather than a private copy of the formula, so the score the rewrite
 * optimises against and the score the user is shown are the same number
 * by construction.
 *
 * @param {object} draft - The draft so far. Its skills array is replaced.
 * @param {string} jobText - The advert.
 * **How far it may go depends on how close the CV already is.** Both
 * levers are scaled by `fieldFit`, and on an advert from a different
 * field they are switched off entirely. Without that, the pass behaved
 * backwards: the less a CV had to do with an advert, the more it had to
 * invent to reach the target, so the worst-matched CVs got the most
 * fabrication and came back reporting the same 80% as a genuinely
 * well-matched one. A target that can always be reached is not a
 * measurement of anything.
 *
 * @param {string[]} suggested - Skills the advert wants and the CV cannot
 *   evidence, from `tailorSkills`.
 * @param {{priorJobDescriptions: string[], profile: object, fit: object,
 *          source: object, record: (change: object) => void}} context
 * @returns {{assumed: string[], focus: string[], stillSuggested: string[],
 *            score: number, honestScore: number, reached: boolean}}
 */
function reachTarget(draft, jobText, suggested, context) {
  const { priorJobDescriptions, profile, fit, record, source } = context;

  let score = analyseMatch(draft, jobText, { priorJobDescriptions }).matchScore;
  const target = TAILOR_CONFIG.targetScore;

  // The score the honest steps reached on their own, kept before either
  // lever touches the draft. It is reported whatever happens next.
  const honestScore = score;

  // How much of each ceiling this CV's distance from the advert allows.
  // `Math.floor` rather than rounding, so a half allowance of a small
  // ceiling errs downwards: these are the two things the rewrite does
  // that the CV cannot back up, and the error worth making is doing
  // less of them.
  const maxFocusTerms = Math.floor(TAILOR_CONFIG.maxFocusTerms * fit.allowance);

  // Skills a previous rewrite assumed count against this one's ceiling.
  // The ceiling is a limit on how much of a finished CV is unevidenced,
  // not on how much any single run may add: counted per run, tailoring
  // an already-tailored CV would start again from zero and the
  // assumptions would accumulate a few at a time with every advert.
  const alreadyAssumed = (draft.skills ?? []).filter((skill) => skill?.assumed).length;
  const maxAssumed = Math.max(
    0,
    Math.floor(TAILOR_CONFIG.skills.maxAssumed * fit.allowance) - alreadyAssumed,
  );

  if (score >= target || !hasContentToTailor(source) || fit.allowance === 0) {
    return {
      assumed: [],
      focus: [],
      stillSuggested: suggested,
      score,
      honestScore,
      reached: score >= target,
    };
  }

  // Most-wanted first, so a single addition is the most useful one.
  const queue = [...suggested].sort((a, b) => relevanceOf(b, profile) - relevanceOf(a, profile));

  const assumed = [];

  while (queue.length > 0 && score < target && assumed.length < maxAssumed) {
    const name = queue.shift();

    draft.skills = [...draft.skills, { name, level: 'Intermediate', assumed: true }];
    assumed.push(name);

    score = analyseMatch(draft, jobText, { priorJobDescriptions }).matchScore;
  }

  // --- Lever two: speak the advert's language ----------------------------
  //
  // Coverage is only 55% of the score. The other 45% asks how much the CV
  // *reads* like the advert, and on a CV that already names every skill
  // the advert wants, listing more cannot move it at all — which is why
  // the first lever alone leaves some CVs stuck in the fifties.
  //
  // The lever that does move it is vocabulary: the advert's own phrases
  // for the work ("organic search", "cost per acquisition", "channel
  // performance"). Mirroring an advert's language is ordinary CV advice
  // and what every ATS rewards, but it is also the point at which this
  // module writes a line the user did not, so it is done in the open:
  // one clearly-named sentence at the end of the summary, listing the
  // terms, recorded as its own change, and sitting in the summary box
  // the user edits before saving. Nothing is slipped into their roles.
  //
  // Terms are added a few at a time and the draft re-scored after each
  // batch, so the sentence stays as short as the target allows.
  const focus = [];
  const candidates = advertVocabulary(draft, jobText, profile);

  while (candidates.length > 0 && score < target && focus.length < maxFocusTerms) {
    focus.push(
      ...candidates.splice(0, Math.min(TAILOR_CONFIG.focusBatchSize, maxFocusTerms - focus.length)),
    );
    draft.summary = withFocusSentence(draft.summary, focus);

    score = analyseMatch(draft, jobText, { priorJobDescriptions }).matchScore;
  }

  if (focus.length > 0) {
    record({
      section: 'summary',
      kind: 'aligned',
      after: focusSentence(focus),
      reason:
        `Added to reach a ${target}% match. These are the advert's own words for the work, ` +
        "which your CV never uses — and matching an advert's language is most of what a " +
        'screening system measures. Keep only the ones that describe work you have actually ' +
        'done, and reword the sentence so it sounds like you.',
    });
  }

  for (const name of assumed) {
    record({
      section: 'skills',
      kind: 'assumed',
      after: name,
      reason:
        `Added to reach a ${target}% match. Your CV does not mention ${name} anywhere, so ` +
        'this is an assumption, not something the rewrite found. Remove it if you do not ' +
        'have it — the score will fall, and it should.',
    });
  }

  return { assumed, focus, stillSuggested: queue, score, honestScore, reached: score >= target };
}

export default tailorCV;
