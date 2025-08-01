import express, { Router, RequestHandler } from 'express';
const { body } = require('express-validator');
import mediaController from '../controllers/media.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { MediaType, VideoProvider } from '../interfaces/media.interfaces';
import { ContentStatus } from '../interfaces/content.interfaces';
import { requireRemotePermission } from '../middlewares/permission.middleware';

const router: Router = express.Router();

router.use(authMiddleware as RequestHandler);
router.use(requireRemotePermission('media:manage', { application: 'cms', allowSuperadmin: true }) as any);

/**
 * @route GET /api/media
 * @desc Get all media with pagination and filtering
 * @access Public
 */
router.get('/', 
 
  mediaController.getAllMedia as RequestHandler);

/**
 * @route GET /api/media/search
 * @desc Search media using Elasticsearch
 * @access Public
 */
router.get('/search',
  mediaController.searchMedia as RequestHandler);

/**
 * @route POST /api/media
 * @desc Create a new media item
 * @access Private (Content Manager, Admin)
 */
router.post(
  '/',
  [
    body('title', 'Title is required').notEmpty(),
    body('description', 'Description is required').notEmpty(),
    body('type', `Type must be one of: ${Object.values(MediaType).join(', ')}`).isIn(Object.values(MediaType)),
    body('url', 'URL is required').notEmpty(),
    body('category', 'Category is required').notEmpty(),
  ],
  mediaController.createMedia as RequestHandler
);

/**
 * @route GET /api/media/type/:type
 * @desc Get media by type
 * @access Public
 */
router.get('/type/:type', mediaController.getMediaByType as RequestHandler);

/**
 * @route GET /api/media/slug/:slug
 * @desc Get media by slug
 * @access Public
 */
router.get('/slug/:slug', mediaController.getMediaBySlug as RequestHandler);

/**
 * @route GET /api/media/:mediaId
 * @desc Get media by ID
 * @access Public
 */
router.get('/:mediaId', mediaController.getMediaById as RequestHandler);

/**
 * @route PUT /api/media/:mediaId
 * @desc Update media
 * @access Private (Content Manager, Admin)
 */
router.put(
  '/:mediaId',

  [
    body('title').optional().notEmpty().withMessage('Title must not be empty if provided'),
    body('description').optional().notEmpty().withMessage('Description must not be empty if provided'),
    body('type').optional().isIn(Object.values(MediaType)).withMessage(`Type must be one of: ${Object.values(MediaType).join(', ')}`),
    body('url').optional().notEmpty().withMessage('URL must not be empty if provided'),
    body('category').optional().notEmpty().withMessage('Category must not be empty if provided'),
    body('videoProvider').optional().isIn(Object.values(VideoProvider)).withMessage(`Video provider must be one of: ${Object.values(VideoProvider).join(', ')}`),
  ],
  mediaController.updateMedia as RequestHandler
);

/**
 * @route DELETE /api/media/:mediaId
 * @desc Delete media
 * @access Private (Content Manager, Admin)
 */
router.delete(
  '/:mediaId',
  mediaController.deleteMedia as RequestHandler
);

/**
 * @route PATCH /api/media/:mediaId/status
 * @desc Update media status
 * @access Private (Content Manager, Admin)
 */
router.patch(
  '/:mediaId/status',
  [
    body('status', `Status must be one of: ${Object.values(ContentStatus).join(', ')}`).isIn(Object.values(ContentStatus)),
  ],
  mediaController.updateMediaStatus as RequestHandler
);

/**
 * @route POST /api/media/:mediaId/download
 * @desc Track media download
 * @access Public
 */
router.post('/:mediaId/download', mediaController.trackDownload as RequestHandler);

export default router;
