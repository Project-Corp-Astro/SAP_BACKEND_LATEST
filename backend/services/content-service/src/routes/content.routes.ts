import express, { Router, RequestHandler } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as contentController from '../controllers/content.controller';
import { requireRemotePermission } from '../middlewares/permission.middleware';

const router: Router = express.Router();



router.use(authMiddleware as RequestHandler);
/**
 * @route GET /api/content
 * @desc Get all content with pagination and filtering
 * @access Private (super_admin, content_manager)
 */
router.get('/', 
  requireRemotePermission(
    'content:read', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
  contentController.getAllContent as RequestHandler);

/**
 * @route POST /api/content
 * @desc Create new content
 * @access Private (Admin, Content Manager)
 */
router.post(
  '/',
  requireRemotePermission(
    'content:create', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
  contentController.createContent as RequestHandler,
);

/**
 * @route GET /api/content/articles
 * @desc Get all articles
 * @access Public
 */
router.get('/articles', 
  requireRemotePermission(
    'content:read', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
  contentController.getArticles as RequestHandler);

/**
 * @route GET /api/content/categories
 * @desc Get all categories
 * @access Public
 */
router.get('/categories',
  requireRemotePermission(
    'content:read', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
  contentController.getAllCategories as RequestHandler);

/**
 * @route GET /api/content/slug/:slug
 * @desc Get content by slug
 * @access Public
 */
router.get('/slug/:slug', 
  requireRemotePermission(
    'content:read', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
  contentController.getContentBySlug as RequestHandler);

/**
 * @route GET /api/content/:contentId
 * @desc Get content by ID
 * @access Public
 */
router.get('/:contentId', 
  requireRemotePermission(
    'content:read', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
contentController.getContentById as RequestHandler);

/**
 * @route PUT /api/content/:contentId
 * @desc Update content
 * @access Private (Admin, Content Manager)
 */
router.put(
  '/:contentId',
  requireRemotePermission(
    'content:update', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
  contentController.updateContent as RequestHandler,
);

/**
 * @route DELETE /api/content/:contentId
 * @desc Delete content
 * @access Private (Admin, Content Manager)
 */
router.delete(
  '/:contentId',
  requireRemotePermission(
    'content:delete', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
  contentController.deleteContent as RequestHandler,
);

/**
 * @route PATCH /api/content/:contentId/status
 * @desc Update content status
 * @access Private (Admin, Content Manager)
 */
router.patch(
  '/:contentId/status',
  requireRemotePermission(
    'content:update', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
  contentController.updateContentStatus as RequestHandler,
);

/**
 * @route POST /api/content/categories
 * @desc Create category
 * @access Private (Admin, Content Manager)
 */
router.post(
  '/categories',
  requireRemotePermission(
    'content:create', 
    { application: 'cms',
        allowSuperadmin: true
    }) as any as RequestHandler,
  contentController.createCategory as RequestHandler,
);

export default router;
