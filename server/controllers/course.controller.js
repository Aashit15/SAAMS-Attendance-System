import Course from '../models/Course.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import catchAsync from '../utils/catchAsync.js';

export const createCourse = catchAsync(async (req, res) => {
  const course = await Course.create(req.body);
  return sendSuccess(res, 201, 'Course created', { course });
});

export const getCourses = catchAsync(async (req, res) => {
  const { department, page = 1, limit = 20 } = req.query;
  const filter = { isActive: true };
  if (department) filter.department = department;

  const total = await Course.countDocuments(filter);
  const courses = await Course.find(filter)
    .populate('department', 'name code').populate('faculty', 'name email')
    .skip((page - 1) * limit).limit(parseInt(limit)).sort({ name: 1 });

  // Add student count
  const coursesWithCount = courses.map(c => ({ ...c.toObject(), studentCount: c.students.length }));
  return sendSuccess(res, 200, 'Courses list', { courses: coursesWithCount }, { page: parseInt(page), limit: parseInt(limit), total });
});

export const getCourse = catchAsync(async (req, res) => {
  const course = await Course.findById(req.params.id).populate('department', 'name code').populate('faculty', 'name email').populate('students', 'name email rollNumber isFaceRegistered');
  if (!course) return sendError(res, 404, 'Course not found');
  return sendSuccess(res, 200, 'Course detail', { course });
});

export const updateCourse = catchAsync(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!course) return sendError(res, 404, 'Course not found');
  return sendSuccess(res, 200, 'Course updated', { course });
});

export const deleteCourse = catchAsync(async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return sendError(res, 404, 'Course not found');
  return sendSuccess(res, 200, 'Course deleted');
});

export const enrollStudent = catchAsync(async (req, res) => {
  const { studentIds } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) return sendError(res, 404, 'Course not found');

  const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
  for (const sid of ids) {
    if (!course.students.includes(sid)) course.students.push(sid);
  }
  await course.save();
  return sendSuccess(res, 200, 'Students enrolled', { course });
});

export const unenrollStudent = catchAsync(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return sendError(res, 404, 'Course not found');
  course.students = course.students.filter(s => s.toString() !== req.params.studentId);
  await course.save();
  return sendSuccess(res, 200, 'Student unenrolled');
});

export const getCourseStudents = catchAsync(async (req, res) => {
  const course = await Course.findById(req.params.id).populate('students', 'name email rollNumber isFaceRegistered avatar department');
  if (!course) return sendError(res, 404, 'Course not found');
  return sendSuccess(res, 200, 'Course students', { students: course.students });
});
