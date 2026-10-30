/**
 * Templates: the catalogue users choose from, and the admin's control
 * over what is in it.
 */
import { Template } from '../models/Template.js';
import { TEMPLATE_CATALOGUE } from '../data/templateCatalogue.js';
import { logActivity } from '../services/activityLogger.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Shapes one template for the client.
 * @param {object} template - A Template document or lean object.
 * @returns {object}
 */
function toJSON(template) {
  return {
    id: template._id?.toString(),
    key: template.key,
    name: template.name,
    description: template.description,
    isActive: template.isActive,
    sortOrder: template.sortOrder,
    usesPhoto: template.usesPhoto,
  };
}

/**
 * GET /api/templates
 *
 * The templates a user may choose from: the active ones, in order.
 *
 * On a database where the catalogue has never been seeded this returns
 * every template rather than none. An empty collection means "nobody has
 * set this up", not "the admin has withdrawn all eleven", and answering
 * with an empty list would leave the builder with no template to pick —
 * a worse failure than ignoring a setting that was never made.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function listTemplates(_req, res) {
  const count = await Template.estimatedDocumentCount();

  if (count === 0) {
    sendSuccess(
      res,
      {
        templates: TEMPLATE_CATALOGUE.map((entry, index) => ({
          ...entry,
          id: null,
          isActive: true,
          sortOrder: index,
        })),
        seeded: false,
      },
      'Templates',
    );
    return;
  }

  const templates = await Template.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();

  sendSuccess(res, { templates: templates.map(toJSON), seeded: true }, 'Templates');
}

/**
 * GET /api/admin/templates
 * Every template, active or not, so the admin can see what they have
 * switched off as well as what is on.
 */
export async function listAllTemplates(_req, res) {
  const templates = await Template.find().sort({ sortOrder: 1, name: 1 }).lean();

  sendSuccess(
    res,
    {
      templates: templates.map(toJSON),
      // The admin screen needs to say "run the seed" rather than show an
      // empty table that looks like a fault.
      seeded: templates.length > 0,
    },
    'Templates',
  );
}

/**
 * PATCH /api/admin/templates/:id
 *
 * Activates, deactivates or renames one template.
 *
 * Deactivating the last active template is refused: a user with no
 * template to choose cannot build a CV at all, and an admin unticking
 * boxes one by one would not discover that until somebody complained.
 */
export async function updateTemplate(req, res) {
  const template = await Template.findById(req.params.id);
  if (!template) throw ApiError.notFound('Template not found');

  const { isActive, name, description, sortOrder } = req.body;

  if (isActive === false && template.isActive) {
    const activeCount = await Template.countDocuments({ isActive: true });
    if (activeCount <= 1) {
      throw ApiError.badRequest('At least one template must stay active, or nobody can build a CV');
    }
  }

  if (isActive !== undefined) template.isActive = isActive;
  if (name !== undefined) template.name = name;
  if (description !== undefined) template.description = description;
  if (sortOrder !== undefined) template.sortOrder = sortOrder;

  await template.save();

  await logActivity({
    userId: req.user._id,
    action: 'ADMIN_ACTION',
    meta: {
      action: isActive === undefined ? 'TEMPLATE_EDIT' : isActive ? 'TEMPLATE_ON' : 'TEMPLATE_OFF',
      template: template.key,
    },
    ip: req.ip,
  });

  sendSuccess(res, { template: toJSON(template) }, 'Template updated');
}
