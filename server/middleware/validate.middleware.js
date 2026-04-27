import { validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse.js';

/**
 * Run express-validator checks and return errors if any.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return sendError(res, 400, messages.join(', '));
  }
  next();
};

export default validate;
