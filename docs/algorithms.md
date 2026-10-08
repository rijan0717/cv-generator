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

---

## 3. Job-Tailored CV Rewrite

Files: `server/src/algorithms/cvTailor.js` and
`server/src/algorithms/phraseRewriter.js`.
Weights and thresholds: `TAILOR_CONFIG` in `server/src/config/scoringConfig.js`.

### 3.1 Purpose

Given one CV and one job advert, produce a **draft second CV** aimed at that
advert, together with a list of every change and the reason for it.

**Input:** a CV document, the advert text, and the adverts already analysed in
the system (which join the TF-IDF corpus).
**Output:** `{ draft, changes[], suggestedSkills[], notes[] }`.

### 3.2 The constraint that shapes it

There is no language model. A program that cannot write English must not
pretend to, so the rewrite is limited to four operations that are honest
without being creative:

| Operation   | What it does                                                      | Why it is safe                                    |
| ----------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| Re-ordering | Most relevant achievements, projects, skills and sections first   | The same facts, read in a different order         |
| Re-wording  | Promotes the verb the user already wrote to the front of the line | The verb comes from the user's own sentence       |
| Re-spelling | "JS" to "JavaScript" where the advert says "JavaScript"           | Only between aliases of one dictionary entry      |
| Assembling  | Builds a summary from CV facts joined by fixed connecting phrases | Every noun, number and skill is already on the CV |

Where it cannot act honestly it says so instead. A bullet with no verb to
promote, and a role that quantifies nothing, come back in `notes` as advice.
The module will not choose a verb or invent a figure on the user's behalf.
This is the answer to "does it make things up?" in the viva: it has no
generator, so it cannot.

### 3.3 Relevance

One definition is used everywhere: the share of the advert's highest-weighted
TF-IDF vocabulary that a piece of text covers.

```
profile    = top 60 terms of tfidfVector(advert) by weight
total      = sum of their weights

             sum of profile[t] for each DISTINCT term t in text
rel(text) =  --------------------------------------------------
                                 total
```

Distinct terms, not repeated ones. Saying "Node.js" eight times in one bullet
does not make it eight times more relevant — counting it that way would reward
exactly the keyword stuffing the match analyser exists to detect.

The weighting is the same `tfidf.js` the match analyser uses, over the same
corpus, so a change the tailor makes and the score the analyser reports cannot
disagree about what the advert is asking for.

### 3.4 The seven steps

1. **Weight the advert.** Build the relevance profile above.
2. **Headline.** Set it to the advertised job title.
3. **Skills.** Split the advert's skills three ways (section 3.5).
4. **Experience.** Re-word each line (section 3.6), re-order each role's
   achievements by relevance, tie-broken by whether the line quantifies
   anything. **Roles themselves are never re-ordered** — a reader judges a
   career by its chronology, and shuffling roles by keyword would make a
   recent job look like an old one.
5. **Projects.** The same re-wording, and the projects _are_ re-ordered,
   because unlike roles they have no expected order.
6. **Summary.** Assemble from CV facts (section 3.7).
7. **Section order.** Sort the movable sections by relevance, within the slots
   they already occupy — `summary` stays at the top and `references` at the
   bottom. A margin of 0.02 stops near-equal sections swapping on noise.

### 3.5 The three kinds of skill

This is the ethical core of the feature.

| Group         | Condition                                             | Action                   |
| ------------- | ----------------------------------------------------- | ------------------------ |
| **Promoted**  | Advert wants it, CV lists it                          | Moved to the front       |
| **Added**     | Advert wants it, CV describes it but does not list it | Added to the skills list |
| **Suggested** | Advert wants it, CV never mentions it                 | **Never added.** Offered |

An "added" skill is one the user has already claimed in their own words
somewhere on the CV; a screening system reads the skills section first, so
moving it there costs nothing and claims nothing new. A "suggested" skill has
no evidence at all, and adding it would be the program putting words in the
user's mouth.

### 3.6 Re-wording a line

```
rewriteAsAction(line):
    opener := the weak opener the line starts with, if any
                ("responsible for", "duties included", "worked on", ...)
    if no opener        -> return unchanged
    verb := gerundToBase(first word after the opener)
    if no gerund there  -> return UNCHANGED, with a reason for the user
    return tidy(tense(verb) + rest of the line)
```

`gerundToBase` strips "-ing", undoes a doubled consonant, then consults
`data/actionVerbs.js`:

| Input      | Strip   | Undouble | Word list says             | Result  |
| ---------- | ------- | -------- | -------------------------- | ------- |
| `testing`  | `test`  | —        | `test` is a verb           | `test`  |
| `planning` | `plann` | `plan`   | `plan` is a verb           | `plan`  |
| `writing`  | `writ`  | —        | `writ` is not, `write` is  | `write` |
| `editing`  | `edit`  | —        | `edit` is a verb, leave it | `edit`  |
| `sitting`  | `sitt`  | `sit`    | undoubled, so never `site` | `sit`   |

The word list is what makes this reliable without a table of irregular
gerunds: a spelling rule alone turns `writ` into `write` _and_ `edit` into
`edite`, and nothing but a dictionary can tell those two apart.

Re-spelling then runs over the result. Its boundary rule needs two conditions
on each side rather than one, because skill names contain the punctuation that
would otherwise end a word: the obvious "not next to a letter or digit" rule
matches `node` inside `Node.js` (giving `Node.js.js`) and `js` inside `Vue.js`
(giving `Vue.JavaScript`). A match joined to more text by `.`, `+` or `#` is
therefore refused.

### 3.7 Assembling the summary

Five sentences, each from a named source, added until the word budget runs
out. The first two are never dropped.

| #   | Sentence                                        | Source                                              |
| --- | ----------------------------------------------- | --------------------------------------------------- |
| 1   | "Backend Developer with 3+ years' experience."  | Advert's job title; dates on the experience section |
| 2   | "Skilled in Node.js, Express and Docker."       | Skills, the advert's ones first                     |
| 3   | "Cut API response time by 40% with caching."    | The first achievement containing a number, quoted   |
| 4   | "Holds a BCA in Computer Applications from TU." | The first education entry                           |
| 5   | "Now seeking a Backend Developer role."         | Advert's job title                                  |

Years of experience are the **span from earliest start to latest end**, not
the sum of the roles. Two overlapping three-year jobs are three years of
experience, not six — overstating a career is the one thing a generated
summary must never do.

If the CV does not hold enough to reach the 30-word minimum, a short summary
is returned and `notes` says so. It is never padded with filler.

### 3.8 Worked example

**CV (extract)**

```
Headline:    Junior Developer
Skills:      PHP, Node.js
Experience:  Developer, Acme, 2021-01 to 2024-06
             "Responsible for building REST APIs in Node.js with Express."
             - "Mentored two interns"
             - "Cut API response time by 40% with caching"
Projects:    Recipe blog (PHP), API gateway (Express, Docker)
```

**Advert:** _Backend Developer — build REST APIs with Node.js, Express and
MongoDB. Docker and AWS essential. Write unit tests, work in an agile team._

**Result**

| Step                 | Change                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| Headline             | Junior Developer to **Backend Developer**                                       |
| Skills — promoted    | Node.js moved to the front                                                      |
| Skills — added       | **Express**, **Docker** (described in the role and the project)                 |
| Skills — suggested   | MongoDB, AWS — _not added_, offered to the user                                 |
| Experience — wording | "Responsible for building..." to **"Built REST APIs in Node.js with Express."** |
| Experience — order   | The 40% achievement moved above "Mentored two interns"                          |
| Experience — note    | The shop role quantifies nothing; the user is told, not given a figure          |
| Projects             | API gateway moved above Recipe blog                                             |
| Summary              | "A developer." to the five sentences of section 3.7                             |
| Sections             | skills and projects promoted above education                                    |

The controller runs `analyseMatch` over the original and over the draft and
returns both scores, so the user can see whether the rewrite actually helped
rather than taking it on trust.
