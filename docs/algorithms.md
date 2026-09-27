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
