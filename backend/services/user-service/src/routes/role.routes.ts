import express from 'express';
import { RoleController, getUserRolePermissions } from '../controllers/role.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/requirePermission';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware as any);

// GET /api/roles - Get all roles
router.get('/', 
  requirePermission('role:read', { application: 'system' }) as any,
  RoleController.getRoles as any
);

// POST /api/roles - Create new role
router.post('/', 
  requirePermission('role:create', { application: 'system' }) as any,
  RoleController.createRole as any
);

// PUT /api/roles/:id - Update role permissions
router.put('/:id', 
  requirePermission('role:update', { application: 'system' }) as any,
  RoleController.updateRolePermissions as any
);

// DELETE /api/roles/:id - Delete role
router.delete('/:id', 
  requirePermission('role:delete', { application: 'system' }) as any,
  RoleController.deleteRole as any
);

// POST /api/roles/assign-to-user - Assign role to user
router.post('/assign-to-user', 
  requirePermission('role:assign', { application: 'system' }) as any,
  RoleController.assignRoleToUser as any
);

// POST /api/roles/check-permission - Check permission
router.post('/check-permission', 
 
  RoleController.checkPermission as any
);

// GET /api/roles/users/:userId/permissions - Get user role permissions
router.get('/:userId/role-permissions', 
  // requirePermission('user:read', { application: 'system',allowSuperadmin:true }) as any,
  getUserRolePermissions as any
);

export default router;
