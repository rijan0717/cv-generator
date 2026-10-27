/**
 * Template model.
 *
 * The rendering of a template is a React component in the client — that
 * is the only place it can live, because a template *is* its markup.
 * What the database holds is the catalogue entry beside it: the name and
 * description shown in the picker, and whether the admin is currently
 * offering it at all.
 *
 * The split is deliberate. Storing the markup would mean the admin could
 * break every CV in the system by editing a field; storing nothing would
 * mean "deactivate this template" has nowhere to be recorded.
 *
 * `key` is the join to both sides: it matches the registry in
 * `client/src/templates/index.js` and the `templateKey` on a CV.
 */
import mongoose from 'mongoose';
import { TEMPLATE_KEYS } from './CV.js';

const templateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      // Constrained to the keys the client can actually render: a
      // catalogue entry for a template with no component would be an
      // option that renders as Classic and confuses whoever picked it.
      enum: TEMPLATE_KEYS,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [60, 'Name must be at most 60 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description must be at most 300 characters'],
      default: '',
    },

    /**
     * Whether the template is offered to users.
     *
     * Deactivating hides it from the picker; it does not touch the CVs
     * already using it. Those keep rendering, because the component is
     * still in the build and the CV still stores the key — the admin is
     * withdrawing an option, not deleting work somebody has done.
     */
    isActive: { type: Boolean, default: true },

    /** Position in the picker. Lower comes first. */
    sortOrder: { type: Number, default: 0 },

    /** Whether this template renders the photo, so the picker can say so. */
    usesPhoto: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/** The picker asks for active templates in order, on every page load. */
templateSchema.index({ isActive: 1, sortOrder: 1 });

export const Template = mongoose.model('Template', templateSchema);
export default Template;
