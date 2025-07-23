import express from 'express';
import { 
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateProfile,
  changePassword,
  updateSecurityPreferences,
  getUserDevices,
  removeUserDevice,
  getUserActivity
} from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/requirePermission';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware as any);

// GET /api/users - Get all users with pagination
router.get('/', 
  requirePermission('user:read', { application: 'system' }) as any,
  getUsers as any
);

// GET /api/users/:userId - Get user by ID
router.get('/:userId', 
  requirePermission('user:read', { application: 'system' }) as any,
  getUserById as any
);

// PUT /api/users/:userId - Update user
router.put('/:userId', 
  requirePermission('user:update', { application: 'system' }) as any,
  updateUser as any
);

// DELETE /api/users/:userId - Delete user
router.delete('/:userId', 
  requirePermission('user:delete', { application: 'system' }) as any,
  deleteUser as any
);

// PATCH /api/users/:userId/status - Update user status
router.patch('/:userId/status', 
  requirePermission('user:status:update', { application: 'system' }) as any,
  updateUserStatus as any
);

// PATCH /api/users/profile - Update own profile (no special permission needed - users can update their own profile)
router.patch('/profile', 
  updateProfile as any
);

// PATCH /api/users/password - Change password (no special permission needed - users can change their own password)
router.patch('/password', 
  changePassword as any
);

// PATCH /api/users/security - Update security preferences (no special permission needed)
router.patch('/security', 
  updateSecurityPreferences as any
);

// GET /api/users/devices - Get user devices (no special permission needed - users can view their own devices)
router.get('/devices', 
  getUserDevices as any
);

// DELETE /api/users/devices/:deviceId - Remove user device (no special permission needed)
router.delete('/devices/:deviceId', 
  removeUserDevice as any
);

// GET /api/users/:userId/activity - Get user activity
router.get('/:userId/activity', 
  requirePermission('user:activity:read', { application: 'system' }) as any,
  getUserActivity as any
);

export default router;
