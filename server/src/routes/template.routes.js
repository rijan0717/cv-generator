/**
 * The public template catalogue.
 *
 * No session required: the list is eleven names and descriptions, the
 * same for everybody, and the landing page shows what the builder offers
 * before anyone signs up.
 */
import { Router } from 'express';
import { listTemplates } from '../controllers/template.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(listTemplates));

export default router;
