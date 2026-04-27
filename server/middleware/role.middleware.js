import { sendError } from '../utils/apiResponse.js';

/**
 * Role-based access control middleware.
 * Usage: requireRole('admin', 'superadmin')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Not authorized');
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, `Access denied. Required role(s): ${roles.join(', ')}`);
    }
    next();
  };
};

export default requireRole;
