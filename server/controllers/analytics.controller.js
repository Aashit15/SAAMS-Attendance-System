import Attendance from '../models/Attendance.js';
import Session from '../models/Session.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import catchAsync from '../utils/catchAsync.js';

export const getCourseAnalytics = catchAsync(async (req, res) => {
  const { from, to } = req.query;
  const courseId = req.params.id;
  const course = await Course.findById(courseId);
  if (!course) return sendError(res, 404, 'Course not found');

  const sessionFilter = { course: courseId };
  if (from || to) {
    sessionFilter.date = {};
    if (from) sessionFilter.date.$gte = new Date(from);
    if (to) sessionFilter.date.$lte = new Date(to);
  }

  const sessions = await Session.find(sessionFilter).sort({ date: 1 });
  const totalSessions = sessions.length;
  const enrolledCount = course.students.length;

  // Per-session attendance
  const sessionStats = [];
  for (const s of sessions) {
    const records = await Attendance.find({ session: s._id });
    const byMethod = { qr: 0, facial: 0, manual: 0 };
    records.forEach(r => { if (byMethod[r.method] !== undefined) byMethod[r.method]++; });
    sessionStats.push({
      sessionId: s._id, date: s.date, presentCount: records.length,
      enrolledCount, percentage: enrolledCount ? Math.round((records.length / enrolledCount) * 100) : 0,
      byMethod,
    });
  }

  // Students below threshold
  const threshold = parseInt(process.env.DEFAULT_ATTENDANCE_THRESHOLD) || 75;
  const belowThreshold = [];
  for (const studentId of course.students) {
    const count = await Attendance.countDocuments({ course: courseId, student: studentId, status: 'present' });
    const pct = totalSessions ? Math.round((count / totalSessions) * 100) : 0;
    if (pct < threshold) {
      const student = await User.findById(studentId).select('name email rollNumber');
      if (student) belowThreshold.push({ student, attended: count, total: totalSessions, percentage: pct });
    }
  }

  return sendSuccess(res, 200, 'Course analytics', { totalSessions, enrolledCount, sessionStats, belowThreshold, threshold });
});

export const getStudentAnalytics = catchAsync(async (req, res) => {
  const studentId = req.params.id;
  const courses = await Course.find({ students: studentId }).select('name code totalClasses');
  const courseStats = [];

  for (const course of courses) {
    const totalSessions = await Session.countDocuments({ course: course._id });
    const attended = await Attendance.countDocuments({ course: course._id, student: studentId, status: 'present' });
    const pct = totalSessions ? Math.round((attended / totalSessions) * 100) : 0;
    courseStats.push({ courseId: course._id, courseName: course.name, courseCode: course.code, totalSessions, attended, percentage: pct });
  }

  const recentRecords = await Attendance.find({ student: studentId }).populate('course', 'name code').populate('session', 'date startTime').sort({ markedAt: -1 }).limit(20);

  return sendSuccess(res, 200, 'Student analytics', { courseStats, recentRecords });
});

export const getDepartmentAnalytics = catchAsync(async (req, res) => {
  const deptId = req.params.id;
  const courses = await Course.find({ department: deptId }).select('name code students');
  const stats = [];

  for (const course of courses) {
    const totalSessions = await Session.countDocuments({ course: course._id });
    const totalPossible = totalSessions * course.students.length;
    const totalPresent = await Attendance.countDocuments({ course: course._id, status: 'present' });
    stats.push({
      courseName: course.name, courseCode: course.code,
      totalSessions, enrolledStudents: course.students.length,
      overallPercentage: totalPossible ? Math.round((totalPresent / totalPossible) * 100) : 0,
    });
  }

  return sendSuccess(res, 200, 'Department analytics', { stats });
});

export const getFaceRegistrationStats = catchAsync(async (req, res) => {
  const totalStudents = await User.countDocuments({ role: 'student' });
  const registered = await User.countDocuments({ role: 'student', isFaceRegistered: true });
  const pending = totalStudents - registered;
  return sendSuccess(res, 200, 'Face registration stats', { totalStudents, registered, pending, registrationRate: totalStudents ? Math.round((registered/totalStudents)*100) : 0 });
});
