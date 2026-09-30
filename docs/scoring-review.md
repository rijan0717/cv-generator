# Scoring review — how the two scores are defined, and what is wrong with them

A review of the two numbers the product shows the user: the **AI score** on a CV
and the **AI match** percentage on a job. It records how each one is calculated
today and the defects found while reading the code, so the answers exist before
anybody asks for them in the viva.

Reviewed: 29/09/2026.

Source files:

- `server/src/algorithms/cvStrengthScorer.js`
- `server/src/algorithms/jobMatcher.js`
- `server/src/config/scoringConfig.js`
- `server/src/controllers/jobMatch.controller.js`

---

## 1. AI score — the CV strength score

A rule-based weighted model out of 100. No library is involved, and no model is
trained; every weight is a number written down in `scoringConfig.js` and can be
defended line by line.

### 1.1 Where the marks are

**Completeness — 40 points.** Is anything missing?

| Criterion                                | Points |
| ---------------------------------------- | ------ |
| Personal details (name, headline, email, phone) | 8 |
| Photo uploaded                           | 3      |
| Professional summary present             | 7      |
| At least one education entry             | 6      |
| At least one experience entry or project | 8      |
| At least five skills                     | 5      |
| An address, or a website/LinkedIn/GitHub link | 3 |

**Content quality — 60 points.** Is what is there any good?

| Criterion                                     | Points |
| --------------------------------------------- | ------ |
| Summary between 30 and 120 words              | 10     |
| Descriptions open with an action verb         | 14     |
| Achievements contain a figure                 | 14     |
| Email and phone are plausibly formatted       | 6      |
| No end date falls before its start date       | 6      |
| Each entry is 12–120 words                    | 10     |

The 40/60 split is deliberate: a CV with every section filled in but written as
a list of duties is a weak CV, so most of the marks sit on how it is written.

### 1.2 Partial credit

Most criteria return partial marks rather than pass or fail, through
`proportionalPoints(ratio, target, maxPoints)`. Reaching the target earns full
marks; going beyond it earns no more.

- Action verbs: full marks at a **0.7** ratio of lines, not 1.0.
- Quantified achievements: full marks at a **0.5** ratio of entries.

Both targets are below 1 on purpose. Demanding that *every* bullet carry a
number pushes people into inventing them.

### 1.3 When it runs

The `pre('save')` hook in `server/src/models/CV.js` recalculates the score
whenever scored content changes. Putting it on the model rather than in a
controller means autosave, import and duplicate all keep the score current
without each one remembering to.

---

## 2. AI match — the CV–job match score

```
matchScore = round( (0.45 × scaledCosine + 0.55 × skillCoverage) × 100 )
```

### 2.1 The two halves

They answer different questions, which is why neither is used alone:

- **Cosine similarity** — *does this CV read like this advert?* Language,
  domain, seniority.
- **Skill coverage** — *does it name the specific tools the advert asks for?*

A CV stuffed with the right keywords but describing unrelated work scores well
on coverage and badly on similarity. A CV in the right field that never names a
tool does the reverse. Combining them is what makes the score hard to game.

Coverage is weighted slightly higher (55/45) because a missing named tool is the
concrete, actionable gap.

### 2.2 How the cosine is produced

1. Both texts go through `textProcessor.js`: lowercase, protect technical terms
   (`node.js` → `nodejs`), strip punctuation, tokenise, remove stop words, stem,
   add bigrams.
2. The corpus is ~30 seed adverts from `data/seedJobDescriptions.json` plus up
   to 200 adverts analysed previously, so document frequencies are meaningful
   from the first use and improve with use.
3. Both documents are weighted with TF-IDF against that corpus, using smoothed
   IDF so a weight is never zero on a small corpus.
4. Cosine similarity between the two vectors.

### 2.3 Why the cosine is scaled

`scaleSimilarity` maps the raw value linearly from **[0.05, 0.55]** onto
**[0, 1]**. A CV and an advert are different kinds of document — one written in
the first person about the past, the other in the second person about the
future — so a genuinely strong match sits at roughly 0.15–0.35 raw. Reporting
the raw figure would tell almost every user their CV was hopeless. The raw value
is stored alongside the scaled one, so the transformation is visible rather than
hidden.

### 2.4 Skill coverage

Of the dictionary skills found in the advert, the fraction that appear in the
CV's **skills section only** — not anywhere in the CV. Coverage is meant to
answer "would a recruiter scanning your skills list see what the advert asked
for?", and a tool mentioned once inside a paragraph three jobs ago does not pass
that test. Where a skill *is* mentioned elsewhere, the analysis reports it
separately as a suggestion.

---

## 3. Defects found

Ordered by how much they matter.

### 3.1 An empty CV scores 6, not 0

**Confirmed by running the scorer:** `scoreCV({})` returns **6**, entirely from
the "Consistent dates" criterion, which awards its full 6 points because there
are no dates to be inconsistent. It is a vacuous truth — the CV passes a test it
was never given.

The visible effect is that a blank CV shows `AI score (6)` on the dashboard,
which is hard to explain to anyone who asks where the 6 came from.

**Fix:** award 0 for date consistency when there are no dated entries, and apply
the same rule to any other criterion that rewards the absence of a problem.

### 3.2 The board badge and the analysis page can disagree

`scoreJobsForBoard` calls `scoreJobsAgainstCV` **without** `priorJobDescriptions`.
`createJobMatch` passes up to 200 of them. A different corpus gives different
document frequencies, so different IDF weights, so a different cosine, so a
different score — for the same CV against the same job.

The comment on `combineScore` currently claims the two "can never disagree".
That claim is false as the code stands.

**Fix:** load the same corpus in both controller paths, or state plainly in the
UI that the badge is an estimate.

### 3.3 The formula silently changes from job to job

When an advert names no skill the dictionary recognises, `combineScore` returns
`scaledSimilarity × 100` — a 0/100 weighting instead of 45/55. The intent is
sound (do not punish a user for a gap in our dictionary), but two jobs are then
scored by two different formulas and displayed with identical badges.

**Fix:** either show that coverage was unavailable, or fall back to a coverage
value derived from the whole advert text rather than dropping the term.

### 3.4 Years count as quantified achievements

`hasQuantifiedResult('Worked here from 2019 to 2023')` returns **true**, because
of the "two or more digits" rule that is there to catch "reduced queue time by
20 minutes". Dates, postcodes and phone fragments all trip it.

This inflates a 14-point criterion on exactly the CVs that deserve it least —
ones that list dates instead of results.

**Fix:** exclude four-digit numbers in a plausible year range when they are not
attached to a unit.

### 3.5 Description depth punishes good entries

The 12–120 word window sums an entry's description **plus every achievement
line**, and `passed` requires 100% of entries to fall inside it. A strong role
with five bullets passes 120 words easily and scores nothing on that criterion —
while "Action verbs" counts those same bullets individually.

The two criteria therefore measure the same content at different granularities,
and one of them treats detail as a fault.

**Fix:** measure the description and each achievement line separately, or raise
the ceiling for entries that have achievements.

### 3.6 The photo criterion contradicts our own advice

Three points are awarded for uploading a photo. The ATS-Friendly template exists
precisely so a CV can be submitted without one, UK convention is generally not
to include one, and the suggestion text even offers "or choose a template that
does not use one" — yet the three points are deducted either way.

**Fix:** make the criterion conditional on the chosen template, or drop it and
redistribute the points.

### 3.7 Scores are not reproducible over time

Because the corpus grows with every analysis, a `JobMatch` stored last month
cannot be re-derived today. This is a reasonable trade — the weights genuinely
improve with use — and the raw cosine is stored, so the record is not lost. It
is listed here because it is a fair question to be asked and a poor one to be
surprised by.

---

## 4. Suggested order of work

1. §3.1 — empty CVs scoring 6. Visible on the dashboard, one-line fix.
2. §3.2 — board and analysis disagreeing. Visible to any user who checks.
3. §3.4 — years counted as achievements. Distorts the largest quality criterion.
4. §3.5, §3.6, §3.3 — calibration, when there is time.
5. §3.7 — document only; no change needed.
