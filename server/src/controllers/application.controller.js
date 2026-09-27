/**
 * Application controller.
 *
 * This is the part of the system that handles somebody else's personal
 * data, so the access rules are stated explicitly rather than left
 * implicit in the queries:
 *
 *   - An **applicant** may see their own applications, including the
 *     snapshot they sent, and may withdraw one.
 *   - A **company owner** may see applications to their own jobs, read
 *     the snapshot, download it, and set a status.
 *   - An **admin** may see everything.
 *   - Nobody else may see any of it.
 *
 * A CV contains a full name, phone number, address and email. Access is
 * granted by applying, and only to the company applied to.
 */
import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { CV } from '../models/CV.js';
import { generatePdf } from '../services/pdfService.js';
import { generateDocx } from '../services/docxService.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { buildExportFilename } from '../utils/dateFormat.js';

/**
 * Loads an application the caller may view.
 *
 * @param {string} id - Application id.
 * @param {object} user - The requesting user.
 * @returns {Promise<{application: object, role: 'applicant'|'employer'|'admin'}>}
 */
async function findViewableApplication(id, user) {
  const application = await Application.findById(id)
    .populate('job', 'title postedBy company')
    .populate('applicant', 'name email');

  if (!application) throw ApiError.notFound('Application not found');

  if (user.role === 'admin') return { application, role: 'admin' };

  if (application.applicant._id.equals(user._id)) {
    return { application, role: 'applicant' };
  }

  // The employer check uses postedBy on the job rather than loading the
  // company, so ownership is one comparison.
  if (application.job?.postedBy?.equals(user._id)) {
    return { application, role: 'employer' };
  }

  // Not yours, and not about you.
  throw ApiError.notFound('Application not found');
}

/**
 * POST /api/jobs/:id/apply
 *
 * Applies to a job with one of the caller's CVs. The CV is copied into
 * the application, so later edits to it do not change what the employer
 * is reviewing.
 */
export async function applyToJob(req, res) {
  const { cvId, coverLetter } = req.body;

  const job = await Job.findOne({ _id: req.params.id, isDeleted: false });
  if (!job) throw ApiError.notFound('Job not found');

  if (!job.isAcceptingApplications()) {
    throw ApiError.badRequest('This job is no longer accepting applications');
  }

  // You cannot apply to your own posting.
  if (job.postedBy.equals(req.user._id)) {
    throw ApiError.badRequest('You cannot apply to a job you posted');
  }

  const cv = await CV.findOne({ _id: cvId, user: req.user._id, isDeleted: false });
  if (!cv) throw ApiError.notFound('CV not found');

  const existing = await Application.findOne({ job: job._id, applicant: req.user._id });
  if (existing) throw ApiError.conflict('You have already applied to this job');

  // toObject() takes a plain copy, frozen at this moment.
  const snapshot = cv.toObject();
  delete snapshot._id;
  delete snapshot.user;

  const application = await Application.create({
    job: job._id,
    applicant: req.user._id,
    company: job.company,
    sourceCv: cv._id,
    cvSnapshot: snapshot,
    coverLetter: coverLetter ?? '',
  });

  // Kept in step so the listing does not need to count on every read.
  await Job.updateOne({ _id: job._id }, { $inc: { applicationCount: 1 } });

  await logActivity({
    userId: req.user._id,
    action: 'JOB_APPLY',
    cvId: cv._id,
    meta: { job: job._id.toString(), title: job.title },
    ip: req.ip,
  });

  sendCreated(res, { application: { id: application._id, status: application.status } }, 'Applied');
}

/**
 * GET /api/applications/mine
 * The caller's own applications.
 */
export async function listMyApplications(req, res) {
  const applications = await Application.find({ applicant: req.user._id })
    .select('status coverLetter createdAt job')
    .populate({
      path: 'job',
      select: 'title location jobType isDeleted',
      populate: { path: 'company', select: 'name logoUrl' },
    })
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, { applications }, 'Your applications');
}

/**
 * GET /api/jobs/:id/applications
 *
 * Applications to one of the caller's own jobs. Returns a summary per
 * row, not the full snapshot — a list of twenty CVs would be a large
 * response, and the employer only needs the detail when they open one.
 */
export async function listJobApplications(req, res) {
  const filter = { _id: req.params.id, isDeleted: false };
  if (req.user.role !== 'admin') filter.postedBy = req.user._id;

  const job = await Job.findOne(filter);
  if (!job) throw ApiError.notFound('Job not found');

  const applications = await Application.find({ job: job._id })
    .populate('applicant', 'name email avatarUrl')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(
    res,
    {
      job: { id: job._id, title: job.title },
      applications: applications.map((application) => ({
        id: application._id,
        status: application.status,
        createdAt: application.createdAt,
        applicant: application.applicant,
        coverLetter: application.coverLetter,
        // Enough to identify the CV without sending all of it.
        cvTitle: application.cvSnapshot?.title ?? 'CV',
        headline: application.cvSnapshot?.personal?.headline ?? '',
      })),
    },
    'Applications',
  );
}

/**
 * GET /api/applications/:id
 * One application in full, including the CV snapshot.
 */
export async function getApplication(req, res) {
  const { application, role } = await findViewableApplication(req.params.id, req.user);

  const payload = {
    id: application._id,
    status: application.status,
    coverLetter: application.coverLetter,
    createdAt: application.createdAt,
    job: application.job,
    cv: application.cvSnapshot,
  };

  // The employer's private note is exactly that: never shown to the
  // person it is about.
  if (role !== 'applicant') payload.employerNote = application.employerNote;
  if (role !== 'applicant') payload.applicant = application.applicant;

  sendSuccess(res, { application: payload }, 'Application');
}

/**
 * PATCH /api/applications/:id/status
 * The employer moves an application through their process.
 */
export async function updateApplicationStatus(req, res) {
  const { status, employerNote } = req.body;

  const { application, role } = await findViewableApplication(req.params.id, req.user);

  if (role === 'applicant') {
    // An applicant may withdraw, and nothing else.
    if (status !== 'withdrawn') {
      throw ApiError.forbidden('You can only withdraw your own application');
    }
  }

  application.status = status;
  if (role !== 'applicant' && employerNote !== undefined) {
    application.employerNote = employerNote;
  }

  await application.save();

  sendSuccess(res, { status: application.status }, 'Application updated');
}

/**
 * GET /api/applications/:id/download/:format
 *
 * Downloads the submitted snapshot as PDF or Word.
 *
 * The snapshot is written to a temporary CV document so the existing
 * export services can be reused unchanged, then removed. Reusing them
 * matters: an employer's copy must look exactly like the candidate's own
 * download, and a second rendering path would inevitably drift.
 */
export async function downloadApplicationCV(req, res) {
  const { format } = req.params;

  if (!['pdf', 'docx'].includes(format)) {
    throw ApiError.badRequest('Format must be pdf or docx');
  }

  const { application } = await findViewableApplication(req.params.id, req.user);

  const snapshot = application.cvSnapshot ?? {};

  if (format === 'docx') {
    const buffer = await generateDocx(snapshot);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${buildExportFilename(snapshot, 'docx')}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  }

  // The PDF route renders a real page, which needs a CV document to read.
  const temporary = await CV.create({
    ...snapshot,
    user: application.applicant._id ?? application.applicant,
    title: snapshot.title ?? 'Application CV',
  });

  try {
    const buffer = await generatePdf({
      cvId: temporary._id.toString(),
      userId: String(temporary.user),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${buildExportFilename(snapshot, 'pdf')}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } finally {
    // Removed whether or not the render succeeded, so a failed download
    // cannot leave a stray CV in the applicant's dashboard.
    await CV.deleteOne({ _id: temporary._id }).catch(() => {});
  }
}
