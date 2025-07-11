import { Router } from 'express';
import { getUserRolePermissions, RoleController } from '../controllers/role.controller';
import { requirePermission } from '../middlewares/requirePermission';
import { asyncHandler } from '../middlewares/validation.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';


const router = Router();

router.use(asyncHandler(authMiddleware));

// Create a new role with permissions
router.post(
  '/',
  requirePermission('role:create', { application: 'system',allowSuperadmin:true }),
  asyncHandler(RoleController.createRole)
);

// Update role permissions
router.put(
  '/:roleId/permissions',
  requirePermission('role:update', { application: 'system',allowSuperadmin:true }),
  asyncHandler(RoleController.updateRolePermissions)
);

// Assign role to user
router.post(
  '/assign',
  requirePermission('user:assign', { application: 'system',allowSuperadmin:true }),
  asyncHandler(RoleController.assignRoleToUser)
);

// List all roles (optionally filtered by application)
router.get(
  '/',
  requirePermission('role:read', { application: 'system',allowSuperadmin:true }),
  asyncHandler(RoleController.listRoles)
);

//get roles for multiple/single rolePermissionIds
router.get(
  '/get-multiple',
  asyncHandler(RoleController.getRoles)
);


// Delete a role
router.delete(
  '/:roleId',
  requirePermission('role:delete', { application: 'system',allowSuperadmin:true }),
  asyncHandler(RoleController.deleteRole)
);

// Check if user has specific permission
router.post(
  '/check-permission',
  asyncHandler(RoleController.checkPermission)
);

router.get('/users/:userId/role-permissions'
  , asyncHandler(getUserRolePermissions));

export default router;
