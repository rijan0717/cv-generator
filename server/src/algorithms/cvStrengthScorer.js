/**
 * CV Strength Score.
 *
 * A weighted, rule-based model that rates a CV out of 100 and explains
 * itself. Written from scratch; no library is involved.
 *
 * Two halves, as specified:
 *
 *   - **Completeness (40 points)** — is anything missing? Cheap to check
 *     and cheap for the user to fix.
 *   - **Content quality (60 points)** — is what is there any good? Action
 *     verbs, quantified achievements, sensible lengths, valid contact
 *     details, consistent dates.
 *
 * Quality carries more weight on purpose. A CV with every section filled
 * in but written as a list of duties is a weak CV, and a scorer that gave
 * it full marks would be misleading.
 *
 * Every criterion returns partial credit where it sensibly can, rather
 * than pass or fail. A user who has quantified two of five achievements
 * has genuinely done better than one who quantified none, and a score
 * that cannot see the difference gives no sense of progress.
 *
 * The output is a breakdown and a list of suggestions, not just a number.
 * A bare score tells someone they are doing badly without telling them
 * what to change.
 */
import { STRENGTH_CONFIG, STRENGTH_TOTALS } from '../config/scoringConfig.js';
import { isActionVerb } from '../data/actionVerbs.js';

const { completeness: C, quality: Q, thresholds: T } = STRENGTH_CONFIG;

/**
 * Counts words in a string.
 * @param {string} text - Any text.
 * @returns {number} The word count.
 */
function wordCount(text) {
  const trimmed = String(text ?? '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Reports whether a line contains a quantified result.
 *
 * Looks for a percentage, a currency amount, a multiplier, or a plain
 * number of two or more digits. A single digit is excluded deliberately:
 * "worked in a team of 5" is a fact, not an achievement, and counting it
 * would reward padding.
 *
 * @param {string} text - A description or achievement line.
 * @returns {boolean} True when something is quantified.
 */
export function hasQuantifiedResult(text) {
  const value = String(text ?? '');

  return (
    /\d+\s*%/.test(value) || // 40%
    /[£$€]\s*\d/.test(value) || // £5,000
    /\b\d+(?:\.\d+)?\s*(?:k|m|bn|million|billion|thousand)\b/i.test(value) || // 500k
    /\b\d+\s*x\b/i.test(value) || // 3x
    /\b\d{2,}\b/.test(value) // 20 or more
  );
}

/**
 * Reports whether a description opens with an action verb.
 *
 * Only the first word of the first line is examined, because that is
 * where the advice applies: "Reduced load time by 40%" versus
 * "Responsible for reducing load time".
 *
 * @param {string} text - A description or achievement line.
 * @returns {boolean} True when it starts with an action verb.
 */
export function startsWithActionVerb(text) {
  const firstLine =
    String(text ?? '')
      .trim()
      .split('\n')[0] ?? '';
  const firstWord = firstLine.trim().split(/\s+/)[0] ?? '';
  return isActionVerb(firstWord);
}

/**
 * Awards marks in proportion to how close a ratio is to its target.
 *
 * Reaching the target earns full marks; beyond it earns no more. The
 * target is below 1 on purpose — insisting that *every* bullet be
 * quantified would push people into inventing numbers.
 *
 * @param {number} ratio - Achieved ratio, 0 to 1.
 * @param {number} target - Ratio needed for full marks.
 * @param {number} maxPoints - Points available.
 * @returns {number} Points earned, rounded to one decimal.
 */
function proportionalPoints(ratio, target, maxPoints) {
  if (target <= 0) return maxPoints;
  const share = Math.min(1, ratio / target);
  return Math.round(share * maxPoints * 10) / 10;
}

/**
 * Scores the completeness half.
 * @param {object} cv - The CV document.
 * @returns {{criteria: Array<object>, suggestions: string[]}}
 */
function scoreCompleteness(cv) {
  const criteria = [];
  const suggestions = [];

  const personal = cv.personal ?? {};

  // Personal details — partial credit per field present.
  const detailFields = [personal.fullName, personal.headline, personal.email, personal.phone];
  const detailsPresent = detailFields.filter((value) => value?.trim()).length;
  const detailPoints =
    Math.round((detailsPresent / detailFields.length) * C.personalDetails * 10) / 10;

  criteria.push({
    criterion: 'Personal details',
    maxPoints: C.personalDetails,
    earned: detailPoints,
    passed: detailsPresent === detailFields.length,
  });
  if (detailsPresent < detailFields.length) {
    suggestions.push('Fill in your name, headline, email and phone number.');
  }

  // Photo.
  const hasPhoto = Boolean(personal.photoUrl);
  criteria.push({
    criterion: 'Photo',
    maxPoints: C.photo,
    earned: hasPhoto ? C.photo : 0,
    passed: hasPhoto,
  });
  if (!hasPhoto) {
    suggestions.push('Add a photo, or choose a template that does not use one.');
  }

  // Summary.
  const hasSummary = Boolean(cv.summary?.trim());
  criteria.push({
    criterion: 'Professional summary',
    maxPoints: C.summary,
    earned: hasSummary ? C.summary : 0,
    passed: hasSummary,
  });
  if (!hasSummary) {
    suggestions.push('Write a short professional summary — it is the first thing anyone reads.');
  }

  // Education.
  const educationCount = cv.education?.length ?? 0;
  criteria.push({
    criterion: 'Education',
    maxPoints: C.education,
    earned: educationCount > 0 ? C.education : 0,
    passed: educationCount > 0,
  });
  if (educationCount === 0) suggestions.push('Add at least one education entry.');

  // Experience or projects — either satisfies this.
  const experienceCount = cv.experience?.length ?? 0;
  const projectCount = cv.projects?.length ?? 0;
  const hasHistory = experienceCount + projectCount > 0;

  criteria.push({
    criterion: 'Experience or projects',
    maxPoints: C.experienceOrProject,
    earned: hasHistory ? C.experienceOrProject : 0,
    passed: hasHistory,
  });
  if (!hasHistory) {
    suggestions.push('Add work experience, or projects if you are early in your career.');
  }

  // Skills — partial credit up to the threshold.
  const skillCount = (cv.skills ?? []).filter((skill) => skill.name?.trim()).length;
  const skillPoints = proportionalPoints(skillCount / T.minSkills, 1, C.skills);

  criteria.push({
    criterion: `Skills (${T.minSkills} or more)`,
    maxPoints: C.skills,
    earned: skillPoints,
    passed: skillCount >= T.minSkills,
  });
  if (skillCount < T.minSkills) {
    suggestions.push(`List at least ${T.minSkills} skills — you currently have ${skillCount}.`);
  }

  // Somewhere else to find you.
  const channels = [personal.address, personal.website, personal.linkedin, personal.github];
  const hasChannel = channels.some((value) => value?.trim());

  criteria.push({
    criterion: 'Location or links',
    maxPoints: C.contactChannels,
    earned: hasChannel ? C.contactChannels : 0,
    passed: hasChannel,
  });
  if (!hasChannel) {
    suggestions.push('Add your location, or a LinkedIn, GitHub or website link.');
  }

  return { criteria, suggestions };
}

/**
 * Scores the content quality half.
 * @param {object} cv - The CV document.
 * @returns {{criteria: Array<object>, suggestions: string[]}}
 */
function scoreQuality(cv) {
  const criteria = [];
  const suggestions = [];

  // --- Summary length ---
  const summaryWords = wordCount(cv.summary);
  let summaryPoints = 0;

  if (summaryWords >= T.summaryMinWords && summaryWords <= T.summaryMaxWords) {
    summaryPoints = Q.summaryLength;
  } else if (summaryWords > 0) {
    // Partial credit, scaled by how far outside the range it falls.
    const distance =
      summaryWords < T.summaryMinWords
        ? summaryWords / T.summaryMinWords
        : T.summaryMaxWords / summaryWords;
    summaryPoints = Math.round(distance * Q.summaryLength * 10) / 10;
  }

  criteria.push({
    criterion: `Summary length (${T.summaryMinWords}–${T.summaryMaxWords} words)`,
    maxPoints: Q.summaryLength,
    earned: summaryPoints,
    passed: summaryWords >= T.summaryMinWords && summaryWords <= T.summaryMaxWords,
  });

  if (summaryWords === 0) {
    suggestions.push('Your summary is empty. Two or three sentences is enough.');
  } else if (summaryWords < T.summaryMinWords) {
    suggestions.push(
      `Your summary is ${summaryWords} words. Aim for at least ${T.summaryMinWords}.`,
    );
  } else if (summaryWords > T.summaryMaxWords) {
    suggestions.push(
      `Your summary is ${summaryWords} words. Trim it to under ${T.summaryMaxWords}.`,
    );
  }

  // The writing criteria look at every description and achievement line.
  const entries = [
    ...(cv.experience ?? []).map((entry) => ({
      text: entry.description,
      lines: entry.achievements ?? [],
      label: entry.position || entry.company || 'an experience entry',
    })),
    ...(cv.projects ?? []).map((project) => ({
      text: project.description,
      lines: [],
      label: project.name || 'a project',
    })),
  ];

  const writtenEntries = entries.filter((entry) => entry.text?.trim() || entry.lines.length > 0);

  // --- Action verbs ---
  if (writtenEntries.length === 0) {
    criteria.push({
      criterion: 'Action verbs',
      maxPoints: Q.actionVerbs,
      earned: 0,
      passed: false,
    });
    suggestions.push('Describe what you did in each role, starting with an action verb.');
  } else {
    const allLines = writtenEntries.flatMap((entry) =>
      [entry.text, ...entry.lines].filter((line) => line?.trim()),
    );
    const withVerb = allLines.filter(startsWithActionVerb).length;
    const ratio = allLines.length > 0 ? withVerb / allLines.length : 0;
    const points = proportionalPoints(ratio, T.actionVerbTargetRatio, Q.actionVerbs);

    criteria.push({
      criterion: 'Action verbs',
      maxPoints: Q.actionVerbs,
      earned: points,
      passed: ratio >= T.actionVerbTargetRatio,
    });

    if (ratio < T.actionVerbTargetRatio) {
      suggestions.push(
        `Only ${withVerb} of ${allLines.length} lines start with an action verb. ` +
          'Try "Built", "Led" or "Reduced" instead of "Responsible for".',
      );
    }
  }

  // --- Quantified achievements ---
  if (writtenEntries.length === 0) {
    criteria.push({
      criterion: 'Quantified achievements',
      maxPoints: Q.quantifiedAchievements,
      earned: 0,
      passed: false,
    });
  } else {
    const quantified = writtenEntries.filter((entry) =>
      [entry.text, ...entry.lines].some(hasQuantifiedResult),
    ).length;
    const ratio = quantified / writtenEntries.length;
    const points = proportionalPoints(ratio, T.quantifiedTargetRatio, Q.quantifiedAchievements);

    criteria.push({
      criterion: 'Quantified achievements',
      maxPoints: Q.quantifiedAchievements,
      earned: points,
      passed: ratio >= T.quantifiedTargetRatio,
    });

    if (ratio < T.quantifiedTargetRatio) {
      suggestions.push(
        `${quantified} of ${writtenEntries.length} entries include a number. ` +
          'Add figures — "reduced load time by 40%" says far more than "improved performance".',
      );
    }
  }

  // --- Contact formats ---
  const personal = cv.personal ?? {};
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email ?? '');
  // Deliberately permissive: phone formats vary by country, so this only
  // rejects something that clearly is not a number.
  const phoneValid = /^[+\d][\d\s().-]{6,}$/.test((personal.phone ?? '').trim());

  const formatPoints =
    (emailValid ? Q.contactFormat / 2 : 0) + (phoneValid ? Q.contactFormat / 2 : 0);

  criteria.push({
    criterion: 'Valid email and phone',
    maxPoints: Q.contactFormat,
    earned: formatPoints,
    passed: emailValid && phoneValid,
  });

  if (!emailValid) suggestions.push('Check your email address — it does not look valid.');
  if (!phoneValid) suggestions.push('Check your phone number — it does not look valid.');

  // --- Date consistency ---
  // Only awarded once there are dates to be consistent about. Giving the
  // full six points to a CV with no entries at all rewarded an empty form
  // for a problem it cannot yet have.
  const dated = [...(cv.experience ?? []), ...(cv.education ?? [])];
  const datedEntries = dated.filter((entry) => entry.startDate || entry.endDate);
  const inconsistent = datedEntries.filter(
    (entry) =>
      entry.startDate && entry.endDate && !entry.isCurrent && entry.endDate < entry.startDate,
  );
  const datesConsistent = datedEntries.length > 0 && inconsistent.length === 0;

  criteria.push({
    criterion: 'Consistent dates',
    maxPoints: Q.dateConsistency,
    earned: datesConsistent ? Q.dateConsistency : 0,
    passed: datesConsistent,
  });

  if (datedEntries.length === 0) {
    suggestions.push('Add start and end dates to your roles and education.');
  }

  if (inconsistent.length > 0) {
    suggestions.push(
      `${inconsistent.length} entr${inconsistent.length === 1 ? 'y has' : 'ies have'} ` +
        'an end date before the start date.',
    );
  }

  // --- Description depth ---
  if (writtenEntries.length === 0) {
    criteria.push({
      criterion: 'Description depth',
      maxPoints: Q.descriptionDepth,
      earned: 0,
      passed: false,
    });
  } else {
    const wellSized = writtenEntries.filter((entry) => {
      const words = wordCount(entry.text) + entry.lines.reduce((n, l) => n + wordCount(l), 0);
      return words >= T.descriptionMinWords && words <= T.descriptionMaxWords;
    }).length;

    const ratio = wellSized / writtenEntries.length;
    const points = Math.round(ratio * Q.descriptionDepth * 10) / 10;

    criteria.push({
      criterion: 'Description depth',
      maxPoints: Q.descriptionDepth,
      earned: points,
      passed: ratio === 1,
    });

    if (ratio < 1) {
      suggestions.push(
        `${writtenEntries.length - wellSized} entr${
          writtenEntries.length - wellSized === 1 ? 'y is' : 'ies are'
        } too short or too long. ` +
          `Aim for ${T.descriptionMinWords}–${T.descriptionMaxWords} words each.`,
      );
    }
  }

  return { criteria, suggestions };
}

/**
 * Measures how much of a CV actually exists yet.
 *
 * The four components checked here are what makes the document a CV at
 * all: something about you, somewhere you have worked or something you
 * have built, where you studied, and what you can do. Contact details are
 * deliberately not among them — an email address is how someone reaches
 * you, not a reason to.
 *
 * @param {object} cv - The CV document.
 * @returns {{present: number, total: number, factor: number, missing: string[]}}
 */
export function foundation(cv) {
  const components = [
    { label: 'a professional summary', has: Boolean(cv.summary?.trim()) },
    {
      label: 'experience or projects',
      has: (cv.experience?.length ?? 0) + (cv.projects?.length ?? 0) > 0,
    },
    { label: 'education', has: (cv.education?.length ?? 0) > 0 },
    {
      label: 'skills',
      has: (cv.skills ?? []).some((skill) => skill.name?.trim()),
    },
  ];

  const present = components.filter((component) => component.has).length;
  const { minFactor } = STRENGTH_CONFIG.foundation;

  return {
    present,
    total: components.length,
    // minFactor with nothing present, rising linearly to 1 with all four.
    factor: minFactor + (1 - minFactor) * (present / components.length),
    missing: components.filter((component) => !component.has).map((component) => component.label),
  };
}

/**
 * Scores a CV out of 100.
 *
 * The criteria are summed as earned, then scaled by the foundation factor
 * above. That scaling is what stops a form with nothing but the name and
 * email the builder copied in from reporting a double-figure score: those
 * details earn about seven points between them, and a tenth of seven is
 * one.
 *
 * `rawScore` is returned alongside the total so the scaling can be shown
 * rather than silently applied.
 *
 * @param {object} cv - A CV document, or a plain object of the same shape.
 * @returns {{totalScore: number, rawScore: number, completenessScore: number,
 *            qualityScore: number, foundation: object,
 *            breakdown: Array<object>, suggestions: string[]}}
 */
export function scoreCV(cv) {
  const safe = cv ?? {};

  const completeness = scoreCompleteness(safe);
  const quality = scoreQuality(safe);

  const sum = (criteria) => criteria.reduce((total, item) => total + item.earned, 0);

  const completenessScore = Math.round(sum(completeness.criteria) * 10) / 10;
  const qualityScore = Math.round(sum(quality.criteria) * 10) / 10;

  const base = foundation(safe);
  const rawScore = Math.round((completenessScore + qualityScore) * 10) / 10;
  const scaled = rawScore * base.factor;

  // A CV that has earned anything at all should not round away to zero:
  // the number is there to show movement while someone types.
  const totalScore = scaled > 0 && scaled < 1 ? 1 : Math.round(scaled);

  const foundationSuggestions =
    base.missing.length > 0
      ? [`Your score is held back until this is a CV: it still needs ${base.missing.join(', ')}.`]
      : [];

  return {
    totalScore,
    rawScore,
    foundation: base,
    completenessScore,
    qualityScore,
    maxCompleteness: STRENGTH_TOTALS.completeness,
    maxQuality: STRENGTH_TOTALS.quality,
    breakdown: [
      ...completeness.criteria.map((c) => ({ ...c, section: 'Completeness' })),
      ...quality.criteria.map((c) => ({ ...c, section: 'Content quality' })),
    ],
    // The foundation comes first when it is holding the score down, then
    // completeness, which is the cheapest to act on, then quality.
    suggestions: [...foundationSuggestions, ...completeness.suggestions, ...quality.suggestions],
  };
}

export default scoreCV;
