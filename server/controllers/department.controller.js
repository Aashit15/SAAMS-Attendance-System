import Department from '../models/Department.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import catchAsync from '../utils/catchAsync.js';

export const createDepartment = catchAsync(async (req, res) => {
  const dept = await Department.create(req.body);
  return sendSuccess(res, 201, 'Department created', { department: dept });
});

export const getDepartments = catchAsync(async (req, res) => {
  const departments = await Department.find({ isActive: true }).populate('head', 'name email').sort({ name: 1 });
  return sendSuccess(res, 200, 'Departments list', { departments });
});

export const getDepartment = catchAsync(async (req, res) => {
  const dept = await Department.findById(req.params.id).populate('head', 'name email');
  if (!dept) return sendError(res, 404, 'Department not found');
  return sendSuccess(res, 200, 'Department', { department: dept });
});

export const updateDepartment = catchAsync(async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!dept) return sendError(res, 404, 'Department not found');
  return sendSuccess(res, 200, 'Department updated', { department: dept });
});

export const deleteDepartment = catchAsync(async (req, res) => {
  const dept = await Department.findByIdAndDelete(req.params.id);
  if (!dept) return sendError(res, 404, 'Department not found');
  return sendSuccess(res, 200, 'Department deleted');
});
