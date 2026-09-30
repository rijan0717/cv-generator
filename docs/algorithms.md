# Algorithms

Supports report section **3.3 Algorithm details**.

Both algorithms below are written from scratch in plain JavaScript in
`server/src/algorithms/`. No NLP, machine-learning or string-similarity library
is used.

They are implemented in **Phase 5**. This file records, for each algorithm:
purpose, formulas, pseudocode, a Mermaid flowchart, and a small worked numeric
example.

---

## 1. CV Strength Score

_To be completed in Phase 5._

Planned structure:

- Purpose, inputs and outputs
- Scoring model: completeness (40 points) and content quality (60 points)
- The weights table taken from `server/src/config/scoringConfig.js`
- Pseudocode
- Flowchart
- Worked example on a sample CV

---

### 1.1 The foundation gate (added after review)

A CV created from the dashboard is not empty: the builder copies the account
name and email into it. Under the criteria alone that earned **13/100** before
the user had typed anything — part of the personal-details mark, half of the
contact-format mark, and the full date-consistency mark, which was awarded for
having no dates to contradict each other.

Two changes fixed it.

1. **Date consistency must be earned.** No dated entry, no marks. A CV cannot
   pass a check it has no data for.
2. **The total is scaled by how much of a CV exists.** Four components make a
   document a CV: a summary, experience or projects, education, and skills.
   Contact details are deliberately excluded — an email address is how someone
   reaches you, not a reason to.

```
present  = number of the four components with content        (0…4)
factor   = minFactor + (1 - minFactor) * (present / 4)        minFactor = 0.1
total    = round(rawScore * factor)
```

The factor rises linearly, so the number still moves as soon as the user does
something, which is the point of showing it live while they type. A CV with all
four components scores exactly as it did before: the gate can only reduce an
unfinished CV.

**Worked example — a newly created CV**

| Criterion         | Earned              |
| ----------------- | ------------------- |
| Personal details  | 4.0 (2 of 4 fields) |
| Valid email/phone | 3.0 (email only)    |
| Everything else   | 0                   |
| **Raw**           | **7.0**             |

`present = 0`, so `factor = 0.1 + 0.9 × 0 = 0.1`, and
`total = round(7.0 × 0.1) = 1`.

A total that rounds to 0 while something was earned is reported as 1, so the
first thing a user types is visible.

---

## 2. CV–Job Match Analyser (ATS simulation)

_To be completed in Phase 5._

Planned structure:

- Purpose, inputs and outputs
- Step 1 — text preprocessing: normalisation of protected technical terms
  before punctuation removal, tokenising, stop-word removal, a
  suffix-stripping stemmer, and bigrams for multi-word skills
- Step 2 — TF-IDF, using smoothed IDF so weights never fall to zero on a small
  corpus:

  ```
  tf(t, d)  = count(t in d) / totalTerms(d)
  idf(t)    = ln((1 + N) / (1 + df(t))) + 1
  w(t, d)   = tf(t, d) * idf(t)
  ```

- Step 3 — cosine similarity between the CV vector and the job description
  vector:

  ```
  cos(A, B) = (A . B) / (||A|| * ||B||)
  ```

- Step 4 — keyword gap analysis over the top-N weighted job description terms
- Step 5 — skill coverage against `server/src/data/skillsDictionary.js`
- Step 6 — overall weighted match score, and the reasoning behind the weights
- Pseudocode
- Flowchart
- Worked example with a small corpus, showing the numbers at each step

### 2.1 Strictness (added after review)

Three changes, for the same reason as the foundation gate: a score that is
generous by default tells the user nothing.

**Similarity scaling.** The realistic band was widened from 0.05–0.55 to
**0.08–0.62**. Two unrelated documents written in the same language still share
enough ordinary vocabulary to clear 0.05, so the old floor paid out for
nothing; the higher ceiling means full marks require the CV to genuinely read
like the advert.

**A ceiling tied to skill coverage.** The weighted sum alone let a CV that
names none of the advert's tools still reach the mid-forties, because it talks
about the same kind of work in the same kind of language. No screening system
would agree.

```
weighted = (scaledSimilarity * 0.45 + skillCoverage * 0.55) * 100
cap      = 45 + (100 - 45) * skillCoverage
score    = round(min(weighted, cap))
```

The cap only ever lowers a score, and applies only when the advert names skills
the dictionary recognises — a gap in our dictionary must not become the user's
problem.

**Bands.** Each raised by five points: Excellent 85, Strong 70, Moderate 55,
Weak 35.

**Worked example — the same CV against the same advert, two stacks**

| Advert's required skills                    | Coverage | Raw cosine | Score | Band      |
| ------------------------------------------- | -------- | ---------- | ----- | --------- |
| JavaScript, React, Node.js, MongoDB, Docker | 0.90     | 0.53       | 87    | Excellent |
| Python, Django, PostgreSQL, Kubernetes      | 0.62     | 0.44       | 64    | Moderate  |

The prose of the advert barely changed between the two rows, so similarity
stays high; it is coverage, and the cap it sets, that separates them. That is
the behaviour an ATS has and the previous model did not.
