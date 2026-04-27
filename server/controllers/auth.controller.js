import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Register a new user.
 * Students get accountStatus = 'pending_face' (must register face to activate).
 * Faculty/admin/superadmin get accountStatus = 'active'.
 */
export const register = catchAsync(async (req, res) => {
  const { name, email, password, role, rollNumber, employeeId, department } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendError(res, 400, 'User with this email already exists');
  }

  const userData = {
    name,
    email,
    password,
    role: role || 'student',
    department,
  };

  if (role === 'student' || !role) {
    userData.rollNumber = rollNumber;
    userData.accountStatus = 'pending_face'; // Must complete face registration
  } else {
    userData.employeeId = employeeId;
    userData.accountStatus = 'active';
  }

  const user = await User.create(userData);

  // For non-students, issue tokens right away
  if (user.accountStatus === 'active') {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return sendSuccess(res, 201, 'Registration successful', {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, accountStatus: user.accountStatus },
      accessToken,
    });
  }

  // For students, return user info but no tokens yet (need face registration)
  return sendSuccess(res, 201, 'Registration successful. Please complete face registration.', {
    user: { id: user._id, name: user.name, email: user.email, role: user.role, accountStatus: user.accountStatus },
    requiresFaceRegistration: true,
  });
});

/**
 * Login
 */
export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return sendError(res, 401, 'Invalid email or password');
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    return sendError(res, 401, 'Invalid email or password');
  }

  // Check account status
  if (user.accountStatus === 'pending_face') {
    return sendError(res, 403, 'Face registration required. Please complete face registration first.', 'FACE_NOT_REGISTERED', {
      userId: user._id,
      requiresFaceRegistration: true,
    });
  }

  if (user.accountStatus === 'suspended') {
    return sendError(res, 403, 'Account suspended. Contact admin.');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, 200, 'Login successful', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      accountStatus: user.accountStatus,
      isFaceRegistered: user.isFaceRegistered,
      department: user.department,
      rollNumber: user.rollNumber,
      employeeId: user.employeeId,
    },
    accessToken,
  });
});

/**
 * Logout
 */
export const logout = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
  }
  res.clearCookie('refreshToken');
  return sendSuccess(res, 200, 'Logged out successfully');
});

/**
 * Refresh access token
 */
export const refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) {
    return sendError(res, 401, 'No refresh token provided');
  }

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== token) {
    return sendError(res, 401, 'Invalid refresh token');
  }

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, 200, 'Token refreshed', { accessToken });
});

/**
 * Get current user profile
 */
export const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).populate('department', 'name code');
  return sendSuccess(res, 200, 'User profile', { user });
});

/**
 * Update user profile
 */
export const updateUser = catchAsync(async (req, res) => {
  const { name, avatar, department } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (avatar) updates.avatar = avatar;
  if (department) updates.department = department;

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('department', 'name code');

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  return sendSuccess(res, 200, 'User updated', { user });
});

/**
 * Get all users (admin)
 */
export const getUsers = catchAsync(async (req, res) => {
  const { role, department, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (department) filter.department = department;

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .populate('department', 'name code')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  return sendSuccess(res, 200, 'Users list', { users }, {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
  });
});
