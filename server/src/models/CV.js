/**
 * CV model.
 *
 * One document holds an entire CV: the owner, the chosen template, the
 * presentation settings and every content section. Keeping it in a single
 * document suits MongoDB here because a CV is always read and written as a
 * whole — the builder loads one CV, edits it and saves it back.
 *
 * Every repeatable section is an array of sub-documents. Sub-document `_id`s
 * are kept, because the builder uses them as React keys when reordering.
 */
import mongoose from 'mongoose';

/** The five templates. Kept here so the model can validate `templateKey`. */
export const TEMPLATE_KEYS = ['classic', 'modern', 'minimal', 'creative', 'ats'];

/** Sections that may be hidden or reordered, in their default order. */
export const SECTION_KEYS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'references',
];

/** Skill levels offered in the builder. */
export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const educationSchema = new mongoose.Schema({
  institution: { type: String, trim: true, default: '' },
  degree: { type: String, trim: true, default: '' },
  fieldOfStudy: { type: String, trim: true, default: '' },
  startDate: { type: String, default: '' }, // stored as YYYY-MM
  endDate: { type: String, default: '' },
  grade: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
});

const experienceSchema = new mongoose.Schema({
  company: { type: String, trim: true, default: '' },
  position: { type: String, trim: true, default: '' },
  location: { type: String, trim: true, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  isCurrent: { type: Boolean, default: false },
  description: { type: String, trim: true, default: '' },
  achievements: { type: [String], default: [] },
});

const skillSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  level: { type: String, enum: SKILL_LEVELS, default: 'Intermediate' },
});

const projectSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  role: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  technologies: { type: [String], default: [] },
  link: { type: String, trim: true, default: '' },
});

const certificationSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  issuer: { type: String, trim: true, default: '' },
  date: { type: String, default: '' },
  credentialLink: { type: String, trim: true, default: '' },
});

const languageSchema = new mongoose.Schema({
  language: { type: String, trim: true, default: '' },
  proficiency: { type: String, trim: true, default: '' },
});

const referenceSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  position: { type: String, trim: true, default: '' },
  company: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
});

/**
 * Presentation settings. Every template reads these through CSS variables,
 * which is what lets one customisation panel work for all five.
 */
const settingsSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: '#0f172a' },
    backgroundColor: { type: String, default: '#ffffff' },
    textColor: { type: String, default: '#1e293b' },
    fontFamily: { type: String, default: 'Inter' },
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    themePreset: { type: String, default: 'slate' },
    spacing: { type: String, enum: ['compact', 'normal'], default: 'normal' },
    sectionOrder: { type: [String], default: SECTION_KEYS },
    hiddenSections: { type: [String], default: [] },
  },
  { _id: false },
);

const personalSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, default: '' },
    headline: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    github: { type: String, trim: true, default: '' },
    photoUrl: { type: String, default: '' },
  },
  { _id: false },
);

const cvSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: [true, 'Please give this CV a title'],
      trim: true,
      maxlength: [100, 'Title must be at most 100 characters'],
    },

    templateKey: {
      type: String,
      enum: TEMPLATE_KEYS,
      default: 'classic',
    },

    settings: { type: settingsSchema, default: () => ({}) },
    personal: { type: personalSchema, default: () => ({}) },

    summary: { type: String, trim: true, default: '' },

    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    skills: { type: [skillSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    languages: { type: [languageSchema], default: [] },
    references: { type: [referenceSchema], default: [] },
    referencesOnRequest: { type: Boolean, default: true },

    /** Latest CV Strength Score. Recalculated on every save in Phase 5. */
    strengthScore: { type: Number, default: 0, min: 0, max: 100 },
    strengthBreakdown: { type: Array, default: [] },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// The dashboard lists a user's CVs newest-first, excluding deleted ones.
cvSchema.index({ user: 1, isDeleted: 1, updatedAt: -1 });

export const CV = mongoose.model('CV', cvSchema);
export default CV;
