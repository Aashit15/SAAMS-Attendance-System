import Attendance from '../models/Attendance.js';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import catchAsync from '../utils/catchAsync.js';
import { matchStudent, findBestMatch } from '../services/faceMatch.service.js';

// Mark attendance via QR code
export const markQR = catchAsync(async (req, res) => {
  const { qrToken } = req.body;
  if (!qrToken) return sendError(res, 400, 'QR token is required');

  let decoded;
  try { decoded = jwt.verify(qrToken, process.env.SESSION_QR_SECRET); }
  catch (e) {
    if (e.name === 'TokenExpiredError') return sendError(res, 400, 'QR code has expired');
    return sendError(res, 400, 'Invalid QR code');
  }

  const session = await Session.findById(decoded.sessionId);
  if (!session) return sendError(res, 404, 'Session not found');
  if (session.status !== 'active') return sendError(res, 400, 'Session is no longer active');

  const course = await Course.findById(session.course);
  if (!course.students.includes(req.user.id)) return sendError(res, 403, 'You are not enrolled in this course');

  const existing = await Attendance.findOne({ session: session._id, student: req.user.id });
  if (existing) return sendError(res, 400, 'Attendance already marked for this session');

  const attendance = await Attendance.create({
    session: session._id, course: session.course, student: req.user.id,
    method: 'qr', status: 'present', markedAt: new Date(),
    ipAddress: req.ip, deviceInfo: req.headers['user-agent'],
  });

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`session:${session._id}`).emit('attendance:marked', {
      studentId: req.user.id, studentName: req.user.name, method: 'qr',
      count: await Attendance.countDocuments({ session: session._id }),
      total: course.students.length,
    });
  }

  return sendSuccess(res, 201, 'Attendance marked successfully via QR', { attendance });
});

// Mark attendance via facial recognition (student self-scan)
export const markFace = catchAsync(async (req, res) => {
  const { sessionId, faceDescriptor } = req.body;
  if (!sessionId || !faceDescriptor) return sendError(res, 400, 'sessionId and faceDescriptor are required');

  const session = await Session.findById(sessionId);
  if (!session) return sendError(res, 404, 'Session not found');
  if (session.status !== 'active') return sendError(res, 400, 'Session is not active');
  if (session.attendanceMode === 'qr') return sendError(res, 400, 'This session only accepts QR attendance');

  const course = await Course.findById(session.course);
  if (!course.students.includes(req.user.id)) return sendError(res, 403, 'Not enrolled in this course');

  const existing = await Attendance.findOne({ session: session._id, student: req.user.id });
  if (existing) return sendError(res, 400, 'Attendance already marked');

  const student = await User.findById(req.user.id);
  if (!student.isFaceRegistered || !student.faceDescriptors.length) {
    return sendError(res, 400, 'Face not registered', 'FACE_NOT_REGISTERED');
  }

  const result = matchStudent(faceDescriptor, student);
  const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.35;
  const lowThreshold = parseFloat(process.env.FACE_LOW_CONFIDENCE_THRESHOLD) || 0.45;

  if (result.distance > lowThreshold) {
    return sendError(res, 400, 'Face mismatch detected. Possible proxy attempt.', 'FACE_MISMATCH', { distance: result.distance, threshold });
  }

  let proxyFlag = false;
  let proxyReason = '';
  if (result.distance > threshold && result.distance <= lowThreshold) {
    proxyFlag = true;
    proxyReason = 'Low confidence face match';
  }

  const attendance = await Attendance.create({
    session: session._id, course: session.course, student: req.user.id,
    method: 'facial', status: 'present', markedAt: new Date(),
    faceMatchDistance: result.distance, faceMatchConfidence: 1 - result.distance,
    ipAddress: req.ip, deviceInfo: req.headers['user-agent'],
    isProxy: proxyFlag, proxyFlagReason: proxyReason,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`session:${session._id}`).emit('attendance:face_marked', {
      studentId: req.user.id, studentName: req.user.name,
      matchDistance: result.distance, confidence: 1 - result.distance,
    });
    if (proxyFlag) {
      io.to(`session:${session._id}`).emit('face:low_confidence', { studentId: req.user.id, distance: result.distance });
    }
  }

  return sendSuccess(res, 201, 'Attendance marked via facial recognition', { attendance });
});

// Bulk facial recognition (faculty classroom scan)
export const facialRecognize = catchAsync(async (req, res) => {
  const { faceDescriptors } = req.body;
  const sessionId = req.params.id;

  const session = await Session.findById(sessionId);
  if (!session) return sendError(res, 404, 'Session not found');
  if (session.status !== 'active') return sendError(res, 400, 'Session is not active');

  const course = await Course.findById(session.course);
  const enrolledStudents = await User.find({
    _id: { $in: course.students }, isFaceRegistered: true,
  }).select('name email rollNumber faceDescriptors');

  const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.35;
  const recognized = [];
  const unrecognized = [];

  for (const descriptor of faceDescriptors) {
    const match = findBestMatch(descriptor, enrolledStudents, threshold);
    if (match) {
      const existing = await Attendance.findOne({ session: session._id, student: match.studentId });
      if (!existing) {
        await Attendance.create({
          session: session._id, course: session.course, student: match.studentId,
          method: 'facial', status: 'present', markedAt: new Date(),
          faceMatchDistance: match.distance, faceMatchConfidence: 1 - match.distance,
        });
        const io = req.app.get('io');
        if (io) io.to(`session:${session._id}`).emit('attendance:face_marked', { studentId: match.studentId, studentName: match.name, matchDistance: match.distance });
      }
      recognized.push({ studentId: match.studentId, name: match.name, distance: match.distance });
    } else {
      unrecognized.push({ descriptor: 'unmatched' });
    }
  }

  return sendSuccess(res, 200, 'Facial recognition complete', { recognized, unrecognizedCount: unrecognized.length });
});

// Get attendance records for a session
export const getSessionAttendance = catchAsync(async (req, res) => {
  const records = await Attendance.find({ session: req.params.id }).populate('student', 'name email rollNumber').sort({ markedAt: 1 });
  return sendSuccess(res, 200, 'Session attendance', { records });
});

// Get attendance records for a student
export const getStudentAttendance = catchAsync(async (req, res) => {
  const { courseId, from, to } = req.query;
  const filter = { student: req.params.id };
  if (courseId) filter.course = courseId;
  if (from || to) {
    filter.markedAt = {};
    if (from) filter.markedAt.$gte = new Date(from);
    if (to) filter.markedAt.$lte = new Date(to);
  }
  const records = await Attendance.find(filter).populate('session', 'date startTime endTime').populate('course', 'name code').sort({ markedAt: -1 });
  return sendSuccess(res, 200, 'Student attendance', { records });
});

// Get attendance records by course
export const getCourseAttendance = catchAsync(async (req, res) => {
  const records = await Attendance.find({ course: req.params.id }).populate('student', 'name email rollNumber').populate('session', 'date').sort({ markedAt: -1 });
  return sendSuccess(res, 200, 'Course attendance', { records });
});
