import Session from '../models/Session.js';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { generateQRToken } from '../utils/generateToken.js';
import catchAsync from '../utils/catchAsync.js';
import QRCode from 'qrcode';

export const createSession = catchAsync(async (req, res) => {
  const { courseId, date, startTime, endTime, attendanceMode, location, type, remarks, qrExpiryMinutes } = req.body;

  const course = await Course.findById(courseId);
  if (!course) return sendError(res, 404, 'Course not found');
  if (!course.faculty.includes(req.user.id)) return sendError(res, 403, 'You are not assigned to this course');

  const sessionData = {
    course: courseId, faculty: req.user.id,
    date: new Date(date), startTime: new Date(startTime), endTime: new Date(endTime),
    attendanceMode: attendanceMode || 'dual', status: 'active',
    location, type: type || 'in-person', remarks,
  };

  if (attendanceMode !== 'facial') {
    const qrExpirySec = (qrExpiryMinutes || 5) * 60;
    const qrToken = generateQRToken(null, courseId, qrExpirySec);
    sessionData.qrToken = qrToken;
    sessionData.qrExpiresAt = new Date(Date.now() + qrExpirySec * 1000);
  }

  const session = await Session.create(sessionData);

  // Update qrToken with actual sessionId
  if (session.qrToken) {
    const qrExpirySec = (qrExpiryMinutes || 5) * 60;
    const qrToken = generateQRToken(session._id.toString(), courseId, qrExpirySec);
    session.qrToken = qrToken;
    await session.save();
  }

  // Increment totalClasses
  course.totalClasses += 1;
  await course.save();

  // Generate QR code data URL
  let qrCodeDataUrl = null;
  if (session.qrToken) {
    qrCodeDataUrl = await QRCode.toDataURL(session.qrToken, { width: 400, margin: 2 });
  }

  return sendSuccess(res, 201, 'Session created', { session, qrCodeDataUrl });
});

export const getSessions = catchAsync(async (req, res) => {
  const { courseId, date, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (courseId) filter.course = courseId;
  if (date) {
    const d = new Date(date);
    filter.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
  }
  if (status) filter.status = status;
  // Faculty sees only their sessions
  if (req.user.role === 'faculty') filter.faculty = req.user.id;

  const total = await Session.countDocuments(filter);
  const sessions = await Session.find(filter)
    .populate('course', 'name code').populate('faculty', 'name email')
    .skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: -1 });

  return sendSuccess(res, 200, 'Sessions list', { sessions }, { page: parseInt(page), limit: parseInt(limit), total });
});

export const getSession = catchAsync(async (req, res) => {
  const session = await Session.findById(req.params.id).populate('course', 'name code students').populate('faculty', 'name email');
  if (!session) return sendError(res, 404, 'Session not found');

  const attendanceRecords = await Attendance.find({ session: session._id }).populate('student', 'name email rollNumber');
  const enrolledCount = session.course.students?.length || 0;

  return sendSuccess(res, 200, 'Session detail', { session, attendanceRecords, enrolledCount, presentCount: attendanceRecords.length });
});

export const updateSession = catchAsync(async (req, res) => {
  const { status, endTime, qrExpiryMinutes, attendanceMode } = req.body;
  const session = await Session.findById(req.params.id);
  if (!session) return sendError(res, 404, 'Session not found');

  if (status) session.status = status;
  if (endTime) session.endTime = new Date(endTime);
  if (attendanceMode) session.attendanceMode = attendanceMode;
  if (qrExpiryMinutes) {
    const qrExpirySec = qrExpiryMinutes * 60;
    const qrToken = generateQRToken(session._id.toString(), session.course.toString(), qrExpirySec);
    session.qrToken = qrToken;
    session.qrExpiresAt = new Date(Date.now() + qrExpirySec * 1000);
  }
  await session.save();

  return sendSuccess(res, 200, 'Session updated', { session });
});

export const deleteSession = catchAsync(async (req, res) => {
  const session = await Session.findByIdAndDelete(req.params.id);
  if (!session) return sendError(res, 404, 'Session not found');
  await Attendance.deleteMany({ session: session._id });
  return sendSuccess(res, 200, 'Session deleted');
});

export const regenerateQR = catchAsync(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return sendError(res, 404, 'Session not found');
  if (session.status !== 'active') return sendError(res, 400, 'Session is not active');

  // Support seconds-based expiry for auto-refresh (default: 10 seconds)
  const expirySeconds = req.query.expirySeconds ? parseInt(req.query.expirySeconds) : 10;
  const qrToken = generateQRToken(session._id.toString(), session.course.toString(), expirySeconds);
  session.qrToken = qrToken;
  session.qrExpiresAt = new Date(Date.now() + expirySeconds * 1000);
  await session.save();

  const qrCodeDataUrl = await QRCode.toDataURL(qrToken, { width: 400, margin: 2 });
  return sendSuccess(res, 200, 'QR regenerated', { qrToken, qrCodeDataUrl, qrExpiresAt: session.qrExpiresAt });
});

export const manualMark = catchAsync(async (req, res) => {
  const { studentId, status } = req.body;
  const session = await Session.findById(req.params.id);
  if (!session) return sendError(res, 404, 'Session not found');

  const existing = await Attendance.findOne({ session: session._id, student: studentId });
  if (existing) {
    existing.status = status || 'present';
    existing.method = 'manual';
    await existing.save();
    return sendSuccess(res, 200, 'Attendance updated', { attendance: existing });
  }

  const attendance = await Attendance.create({
    session: session._id, course: session.course, student: studentId,
    method: 'manual', status: status || 'present', markedAt: new Date(),
  });
  return sendSuccess(res, 201, 'Attendance marked manually', { attendance });
});
