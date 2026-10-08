// joins-demo.js — run with:  mongosh cv_generator joins-demo.js
// Read-only. Every query here is a join against your real cv_generator data.

const line = (t) => print("\n==================== " + t + " ====================");

// ---------------------------------------------------------------- 1. LEFT JOIN
line("1. LEFT JOIN — users + their CVs (nobody dropped)");
printjson(
  db.users.aggregate([
    { $lookup: { from: "cvs", localField: "_id", foreignField: "user", as: "cvs" } },
    { $project: { _id: 0, name: 1, cvCount: { $size: "$cvs" } } },
    { $sort: { cvCount: -1 } },
    { $limit: 5 },
  ]).toArray()
);

// ------------------------------------------------- 2. LEFT vs INNER vs ANTI
line("2. The same join, three ways — count the rows");
const base = { $lookup: { from: "cvs", localField: "_id", foreignField: "user", as: "c" } };

const LEFT = db.users.aggregate([base]).toArray().length;
const INNER = db.users.aggregate([base, { $unwind: "$c" }]).toArray().length;
const ANTI = db.users.aggregate([base, { $match: { c: { $size: 0 } } }]).toArray().length;
const USERS = db.users.countDocuments();
const CVS = db.cvs.countDocuments();

print("users in collection : " + USERS);
print("cvs in collection   : " + CVS);
print("LEFT  ($lookup only)          -> " + LEFT + " rows   (= every user, matched or not)");
print("INNER ($lookup + $unwind)     -> " + INNER + " rows   (= one row per user-CV pair)");
print("ANTI  ($lookup + $size:0)     -> " + ANTI + " rows   (= users with no CV at all)");
print("check: LEFT - ANTI = " + (LEFT - ANTI) + " users have at least one CV");

// --------------------------------------------------- 3. the nullable FK trap
line("3. activitylogs.cv is nullable — INNER silently loses rows");
// LOGIN and REGISTER events have no CV, so cv is null on those documents.

const lookupCv = { $lookup: { from: "cvs", localField: "cv", foreignField: "_id", as: "c" } };

const total = db.activitylogs.countDocuments();
const nulls = db.activitylogs.countDocuments({ cv: null });

const inner = db.activitylogs.aggregate([
  lookupCv,
  { $unwind: "$c" },                                              // INNER
  { $count: "n" },
]).toArray();

const left = db.activitylogs.aggregate([
  lookupCv,
  { $unwind: { path: "$c", preserveNullAndEmptyArrays: true } },  // LEFT
  { $count: "n" },
]).toArray();

print("activitylogs total            : " + total);
print("  of which cv is null         : " + nulls + "   (LOGIN, REGISTER, admin actions...)");
print("INNER JOIN cvs -> rows         : " + (inner[0] ? inner[0].n : 0));
print("LEFT  JOIN cvs -> rows         : " + (left[0] ? left[0].n : 0));
print("rows lost by choosing INNER    : " + ((left[0] ? left[0].n : 0) - (inner[0] ? inner[0].n : 0)));
print("^ an 'events per user' report built on INNER would under-report by that many.");
print("  Note: jobmatches.job is also nullable, but every seeded match happens to");
print("  link a stored advert, so the same bug would not show up in testing there.");

// ------------------------------------------- 4. COALESCE with $ifNull
line("4. LEFT JOIN + $ifNull — the COALESCE equivalent");
printjson(
  db.jobmatches.aggregate([
    { $lookup: { from: "jobs", localField: "job", foreignField: "_id", as: "j" } },
    { $unwind: { path: "$j", preserveNullAndEmptyArrays: true } },
    { $project: {
        _id: 0,
        matchScore: 1,
        linkedJob: { $cond: [{ $ifNull: ["$j", false] }, "stored advert", "pasted text"] },
        title: { $ifNull: ["$j.title", "$jobTitle"] },   // fall back to the typed title
    }},
    { $limit: 6 },
  ]).toArray()
);

// ------------------------------------------------------ 5. multi-level join
line("5. Two joins chained — job -> company -> owner");
printjson(
  db.jobs.aggregate([
    { $match: { isDeleted: false } },
    { $lookup: { from: "companies", localField: "company", foreignField: "_id", as: "co" } },
    { $unwind: "$co" },                                              // INNER: always exists
    { $lookup: { from: "users", localField: "co.owner", foreignField: "_id", as: "owner" } },
    { $unwind: "$owner" },
    { $project: { _id: 0, job: "$title", company: "$co.name", postedBy: "$owner.name" } },
    { $limit: 5 },
  ]).toArray()
);

// ------------------------------------------- 6. join + group (the BI query)
line("6. LEFT JOIN + GROUP BY — applications per job, zeros included");
printjson(
  db.jobs.aggregate([
    { $match: { isDeleted: false } },
    { $lookup: { from: "applications", localField: "_id", foreignField: "job", as: "apps" } },
    { $project: { _id: 0, title: 1, applications: { $size: "$apps" } } },
    { $sort: { applications: -1 } },
    { $limit: 5 },
  ]).toArray()
);

// --------------------------------------- 7. filtered join (condition in ON)
line("7. Condition in the JOIN, not after it — $lookup with a sub-pipeline");
printjson(
  db.users.aggregate([
    { $lookup: {
        from: "cvs",
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$user", "$$uid"] } } },   // the ON clause
          { $match: { strengthScore: { $gte: 70 } } },          // extra ON condition
          { $project: { title: 1, strengthScore: 1, _id: 0 } },
        ],
        as: "strongCvs",
    }},
    { $project: { _id: 0, name: 1, strongCvCount: { $size: "$strongCvs" } } },
    { $sort: { strongCvCount: -1 } },
    { $limit: 5 },
  ]).toArray()
);
print("^ every user still appears, including those with 0 strong CVs.");
print("  Put that strengthScore filter in a $match AFTER the $lookup instead,");
print("  and it becomes an INNER JOIN — those users vanish.");

// -------------------------------------------------- 8. junction / many-many
line("8. Many-to-many through savedjobs — user <-> job");
printjson(
  db.savedjobs.aggregate([
    { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "u" } },
    { $lookup: { from: "jobs", localField: "job", foreignField: "_id", as: "j" } },
    { $unwind: "$u" },
    { $unwind: "$j" },
    { $project: { _id: 0, user: "$u.name", savedJob: "$j.title" } },
    { $limit: 5 },
  ]).toArray()
);

// ---------------------------------------------------------- 9. self join
line("9. SELF JOIN — did anyone apply to their own company's job?");
printjson(
  db.applications.aggregate([
    { $lookup: { from: "jobs", localField: "job", foreignField: "_id", as: "j" } },
    { $unwind: "$j" },
    { $lookup: { from: "companies", localField: "j.company", foreignField: "_id", as: "co" } },
    { $unwind: "$co" },
    { $match: { $expr: { $eq: ["$applicant", "$co.owner"] } } },   // same user, two paths
    { $lookup: { from: "users", localField: "applicant", foreignField: "_id", as: "u" } },
    { $unwind: "$u" },
    { $project: { _id: 0, person: "$u.name", job: "$j.title", company: "$co.name" } },
  ]).toArray()
);
print("(empty result = nobody did it — which is the answer you want)");

// ------------------------------------------------------- 10. performance
line("10. Is the join using an index?");
const ex = JSON.stringify(
  db.users.explain("executionStats").aggregate([
    { $lookup: { from: "cvs", localField: "_id", foreignField: "user", as: "c" } },
  ])
);

const used = [...new Set((ex.match(/"indexesUsed":\[([^\]]*)\]/g) || []))];
const stages = [...new Set(ex.match(/EQ_LOOKUP\w*|IXSCAN|COLLSCAN/g) || [])];

print("join stage    : " + stages.join(", "));
print("indexes used  : " + used.join("  "));
print("");
print("EQ_LOOKUP with an index named = the join probed an index per document. Good.");
print("EQ_LOOKUP_UNWIND / no index   = full scan of the foreign collection per document.");
print("The COLLSCAN above is the OUTER users scan — expected, there is no $match to filter on.");
print("cvs indexes: " + db.cvs.getIndexes().map((i) => JSON.stringify(i.key)).join("  "));

print("\ndone.\n");
