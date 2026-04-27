import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateAccessToken, generateRefreshToken, generateFaceReEnrollToken } from '../utils/generateToken.js';
import catchAsync from '../utils/catchAsync.js';
import jwt from 'jsonwebtoken';
import streamifier from 'streamifier';

export const registerFace = catchAsync(async (req, res) => {
  const { userId, faceDescriptors, faceImage } = req.body;
  if (!userId) return sendError(res, 400, 'userId is required');

  const user = await User.findById(userId);
  if (!user) return sendError(res, 404, 'User not found');
  if (user.role !== 'student') return sendError(res, 400, 'Face registration is only for students');

  const requiredCount = parseInt(process.env.FACE_REQUIRED_DESCRIPTORS) || 5;
  const descriptorLength = parseInt(process.env.FACE_DESCRIPTOR_LENGTH) || 128;

  if (!faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length !== requiredCount) {
    return sendError(res, 400, `Exactly ${requiredCount} face descriptors required`, 'FACE_MODEL_ERROR');
  }
  for (let i = 0; i < faceDescriptors.length; i++) {
    if (!Array.isArray(faceDescriptors[i]) || faceDescriptors[i].length !== descriptorLength) {
      return sendError(res, 400, `Descriptor ${i + 1} must have ${descriptorLength} values`, 'FACE_MODEL_ERROR');
    }
  }

  let faceImageUrl = '';
  if (faceImage) {
    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: process.env.CLOUDINARY_FACE_FOLDER || 'saams_faces', public_id: `face_${user._id}_${Date.now()}` },
          (err, r) => err ? reject(err) : resolve(r)
        );
        const buf = Buffer.from(faceImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        streamifier.createReadStream(buf).pipe(stream);
      });
      faceImageUrl = result.secure_url;
    } catch (e) { console.error('Cloudinary error:', e); }
  }

  user.faceDescriptors = faceDescriptors;
  user.faceImageUrl = faceImageUrl;
  user.faceRegisteredAt = new Date();
  user.isFaceRegistered = true;
  user.accountStatus = 'active';
  await user.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7*24*60*60*1000 });

  return sendSuccess(res, 200, 'Face registration successful. Account activated.', {
    user: { id: user._id, name: user.name, email: user.email, role: user.role, accountStatus: user.accountStatus, isFaceRegistered: true },
    accessToken,
  });
});

export const getFaceStatus = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select('name email rollNumber isFaceRegistered faceImageUrl faceRegisteredAt accountStatus');
  if (!user) return sendError(res, 404, 'User not found');
  return sendSuccess(res, 200, 'Face status', { user });
});

export const deleteFaceData = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendError(res, 404, 'User not found');
  user.faceDescriptors = []; user.faceImageUrl = ''; user.faceRegisteredAt = undefined;
  user.isFaceRegistered = false; user.accountStatus = 'pending_face';
  await user.save({ validateBeforeSave: false });
  return sendSuccess(res, 200, 'Face data deleted');
});

export const reEnrollFace = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendError(res, 404, 'User not found');
  user.faceDescriptors = []; user.faceImageUrl = ''; user.isFaceRegistered = false;
  const token = generateFaceReEnrollToken(user._id);
  user.faceReEnrollToken = token;
  user.faceReEnrollTokenExpires = new Date(Date.now() + 24*60*60*1000);
  await user.save({ validateBeforeSave: false });
  const reEnrollUrl = `${process.env.CLIENT_URL}/face-reenroll/${token}`;
  console.log(`📧 Re-enroll link for ${user.email}: ${reEnrollUrl}`);
  return sendSuccess(res, 200, 'Re-enrollment triggered', { reEnrollUrl });
});

export const faceReenrollWithToken = catchAsync(async (req, res) => {
  const { token } = req.params;
  const { faceDescriptors, faceImage } = req.body;
  let decoded;
  try { decoded = jwt.verify(token, process.env.FACE_REENROLL_TOKEN_SECRET); } catch { return sendError(res, 400, 'Invalid or expired token'); }
  const user = await User.findById(decoded.userId);
  if (!user || user.faceReEnrollToken !== token) return sendError(res, 400, 'Invalid token');
  if (user.faceReEnrollTokenExpires < new Date()) return sendError(res, 400, 'Token expired');

  const requiredCount = parseInt(process.env.FACE_REQUIRED_DESCRIPTORS) || 5;
  if (!faceDescriptors || faceDescriptors.length !== requiredCount) return sendError(res, 400, `Need ${requiredCount} descriptors`);

  let faceImageUrl = '';
  if (faceImage) {
    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: process.env.CLOUDINARY_FACE_FOLDER || 'saams_faces', public_id: `face_${user._id}_${Date.now()}` }, (err, r) => err ? reject(err) : resolve(r));
        const buf = Buffer.from(faceImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        streamifier.createReadStream(buf).pipe(stream);
      });
      faceImageUrl = result.secure_url;
    } catch (e) { faceImageUrl = ''; }
  }

  user.faceDescriptors = faceDescriptors; user.faceImageUrl = faceImageUrl;
  user.faceRegisteredAt = new Date(); user.isFaceRegistered = true; user.accountStatus = 'active';
  user.faceReEnrollToken = undefined; user.faceReEnrollTokenExpires = undefined;
  await user.save({ validateBeforeSave: false });
  return sendSuccess(res, 200, 'Face re-enrollment successful');
});

export const getAllFaceStatus = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const total = await User.countDocuments({ role: 'student' });
  const students = await User.find({ role: 'student' })
    .select('name email rollNumber department isFaceRegistered faceRegisteredAt accountStatus faceImageUrl')
    .populate('department', 'name code')
    .skip((page - 1) * limit).limit(parseInt(limit)).sort({ isFaceRegistered: 1, name: 1 });
  return sendSuccess(res, 200, 'Face registration status', { students }, { page: parseInt(page), limit: parseInt(limit), total });
});
