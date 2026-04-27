/**
 * Standard API response helpers.
 * Every response follows: { success, message, data, pagination? }
 */

export const sendSuccess = (res, statusCode, message, data = null, pagination = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (pagination) response.pagination = pagination;
  return res.status(statusCode).json(response);
};

export const sendError = (res, statusCode, message, errorCode = null, data = null) => {
  const response = { success: false, message };
  if (errorCode) response.errorCode = errorCode;
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};
