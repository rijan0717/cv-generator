/**
 * Every skeleton, connective phrase and threshold the cover letter
 * composer uses, in one place.
 *
 * The composer itself holds no wording at all. That split matters for two
 * reasons: the letter's voice can be changed without touching the logic
 * that decides what goes in it, and in the viva the question "where do
 * the words come from?" has a one-file answer.
 *
 * A skeleton is a template string with `{placeholders}`. The composer
 * fills them from the CV's own facts and never from anywhere else — if a
 * fact is missing the whole sentence is dropped rather than guessed at,
 * which is why several skeletons come in pairs: one for when a fact is
 * available and a shorter one for when it is not.
 */

export const COVER_LETTER_CONFIG = {
  /**
   * How many of the advert's highest-weighted terms steer the letter is
   * not set here: the composer reuses `buildJobProfile` from `cvTailor`,
   * so the figure is `TAILOR_CONFIG.relevanceTerms` and there is one
   * answer to "how is the advert weighted?" rather than two that could
   * drift apart.
   */
  skills: {
    /** How many skills the fit paragraph names. More reads as a list. */
    maxNamed: 4,
    /** Below this, the fit paragraph is dropped instead of padded. */
    minNamed: 2,
  },

  evidence: {
    /** How many achievements or responsibilities the letter cites. */
    maxPoints: 2,
    /** Lines shorter than this carry no information worth a paragraph. */
    minPointCharacters: 25,
    /** Lines longer than this are a paragraph in themselves, not a point. */
    maxPointCharacters: 320,
  },

  /**
   * Word-count guidance for the finished body.
   *
   * Not enforced — the composer reports a note instead of padding or
   * truncating, because both would mean writing words the user cannot
   * account for. A reader who wants a longer letter pastes the advert in.
   */
  length: {
    minWords: 120,
    maxWords: 320,
  },

  /** Gmail shows roughly this much of a subject before truncating. */
  subject: {
    maxCharacters: 140,
  },

  /**
   * The greeting.
   *
   * "Dear Hiring Manager" is used whenever no name was typed. It is
   * deliberately not "To whom it may concern", which reads as a circular.
   */
  greeting: {
    named: 'Dear {recipientName},',
    unnamed: 'Dear Hiring Manager,',
  },

  signOff: 'Kind regards,',

  /**
   * The four paragraph skeletons, in the order they appear.
   *
   * Each key holds the variants for one paragraph. The composer picks the
   * first variant whose placeholders it can all fill from the CV.
   */
  skeletons: {
    /** 1. Why this letter, about this role, at this company. */
    opening: {
      withTitle: 'I am writing to apply for the {jobTitle} position at {company}.',
      withoutTitle: 'I am writing to register my interest in joining {company}.',
      /** Appended when the CV says what the person does. */
      standing: ' I am {headlineWithArticle} with {years} of experience.',
      /** Used when the dates do not support a figure. */
      standingNoYears: ' I am {headlineWithArticle}.',
    },

    /** 2. What they have actually done, in their own words. */
    evidence: {
      lead: 'In my most recent role as {position} at {employer}, I {firstPoint}.',
      leadNoEmployer: 'In my most recent role, I {firstPoint}.',
      second: ' I also {secondPoint}.',
      /** When the CV has projects but no employment history. */
      projectLead: 'Through my work on {projectName}, I {firstPoint}.',
    },

    /**
     * 3. Why that experience answers this advert.
     *
     * With an advert, the letter names only the skills the CV and the
     * advert share — claiming an asked-for skill the CV does not list
     * would be the composer inventing a qualification. The ones it does
     * not match are reported as a note instead, where they are useful
     * advice rather than a false claim.
     */
    fit: {
      withAdvert: 'The advert calls for {skills}, and these are areas I work in directly.',
      withoutAdvert: 'My strongest areas are {skills}.',
    },

    /** 4. What happens next. */
    close: {
      standard:
        'I would welcome the chance to discuss how my experience could support your team. My CV is attached, and I am happy to supply any further detail you need.',
      /** Shorter, for when the letter is already at the long end. */
      brief: 'My CV is attached, and I would welcome the chance to discuss the role further.',
    },
  },

  /** Subject-line skeletons, same first-fillable-wins rule. */
  subjectSkeletons: {
    withTitleAndName: 'Application for {jobTitle} — {fullName}',
    withTitle: 'Application for {jobTitle}',
    withName: 'Application — {fullName}',
    fallback: 'Application',
  },

  /**
   * The notes returned alongside the letter.
   *
   * These are the composer saying what it could not evidence. They are
   * shown to the user as advice; none of them stops a letter being
   * produced, and none is ever papered over by inventing a fact.
   */
  notes: {
    noJobDescription:
      'No job advert was pasted, so the letter leads with your strongest areas rather than the ones this employer asked for. Pasting the advert makes it specific.',
    noQuantifiedAchievement:
      'None of your achievements contains a number, so the letter cites what you did rather than what it was worth. A figure here is the single strongest addition you can make.',
    noExperience: 'Your CV has no work experience, so the letter draws on your projects instead.',
    noEvidence:
      'Your CV has neither experience nor projects with descriptions, so the letter cannot cite anything you have done. Add a description to at least one entry.',
    fewSkills:
      'Fewer than two skills are listed, so the letter does not name any. Add your main skills to the Skills section.',
    tooShort:
      'The letter is shorter than a typical cover letter. Fuller descriptions in your CV give it more to work with.',
    tooLong:
      'The letter is longer than most employers read. Consider trimming the longest description in your CV.',
    noHeadline:
      'Your CV has no headline, so the opening cannot say what you do. Add one in Personal details.',
    /** Interpolated, so it can name the terms it is talking about. */
    skillGap:
      'The advert also asks for {terms}, which your CV does not list. If you have that experience, add it to your Skills section — the letter will not claim it for you.',
    noSkillOverlap:
      "None of your listed skills appears in the advert, so the letter names your strongest areas instead of the advert's. Check you are using the same words the employer used.",
  },
};

export default COVER_LETTER_CONFIG;
