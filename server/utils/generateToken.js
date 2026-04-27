import jwt from 'jsonwebtoken';

/**
 * Generate JWT access token (short-lived)
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

/**
 * Generate JWT refresh token (long-lived)
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

/**
 * Generate a QR session token (seconds-based expiry for anti-proxy)
 */
export const generateQRToken = (sessionId, courseId, expirySeconds = 10) => {
  return jwt.sign(
    { sessionId, courseId, iat: Math.floor(Date.now() / 1000) },
    process.env.SESSION_QR_SECRET,
    { expiresIn: expirySeconds }
  );
};

/**
 * Generate a face re-enrollment token (single-use, 24h)
 */
export const generateFaceReEnrollToken = (userId) => {
  return jwt.sign(
    { userId, purpose: 'face_reenroll' },
    process.env.FACE_REENROLL_TOKEN_SECRET,
    { expiresIn: process.env.FACE_REENROLL_TOKEN_EXPIRES || '24h' }
  );
};
