import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';

// Generate random 128-d face descriptor
const randomDescriptor = () => Array.from({ length: 128 }, () => (Math.random() * 2 - 1) * 0.3);

async function seed() {
  await connectDB();
  console.log('🗑️  Clearing existing data...');
  await Promise.all([User.deleteMany(), Department.deleteMany(), Course.deleteMany(), Session.deleteMany(), Attendance.deleteMany()]);

  // 1. Create Super Admin
  const superAdmin = await User.create({
    name: 'Super Admin', email: 'superadmin@saams.com', password: 'password123',
    role: 'superadmin', accountStatus: 'active', isActive: true,
  });
  console.log('✅ Super Admin created: superadmin@saams.com / password123');

  // 2. Create Admin
  const admin = await User.create({
    name: 'Admin User', email: 'admin@saams.com', password: 'password123',
    role: 'admin', accountStatus: 'active', isActive: true,
  });
  console.log('✅ Admin created: admin@saams.com / password123');

  // 3. Create Departments
  const csDept = await Department.create({ name: 'Computer Science', code: 'CS', description: 'Department of Computer Science & Engineering' });
  const eceDept = await Department.create({ name: 'Electronics & Communication', code: 'ECE', description: 'Department of ECE' });
  console.log('✅ 2 Departments created');

  // 4. Create Faculty
  const faculty1 = await User.create({
    name: 'Dr. Sarah Johnson', email: 'faculty1@saams.com', password: 'password123',
    role: 'faculty', department: csDept._id, employeeId: 'FAC001', accountStatus: 'active', isActive: true,
  });
  const faculty2 = await User.create({
    name: 'Prof. Mike Chen', email: 'faculty2@saams.com', password: 'password123',
    role: 'faculty', department: eceDept._id, employeeId: 'FAC002', accountStatus: 'active', isActive: true,
  });
  console.log('✅ 2 Faculty created: faculty1@saams.com, faculty2@saams.com / password123');

  // 5. Create Students (with random face descriptors)
  const students = [];
  const studentNames = [
    'Alice Williams', 'Bob Anderson', 'Charlie Brown', 'Diana Ross', 'Edward Lee',
    'Fiona Davis', 'George Wilson', 'Hannah Moore', 'Ivan Taylor', 'Julia Martinez',
    'Kevin White', 'Laura Harris', 'Mark Thompson', 'Nancy Garcia', 'Oscar Clark',
    'Patricia Lewis', 'Quinn Robinson', 'Rachel Walker', 'Samuel Hall', 'Tina Allen',
  ];
  for (let i = 0; i < 20; i++) {
    const student = await User.create({
      name: studentNames[i],
      email: `student${i + 1}@saams.com`,
      password: 'password123',
      role: 'student',
      department: i < 10 ? csDept._id : eceDept._id,
      rollNumber: `${i < 10 ? 'CS' : 'ECE'}2024${String(i + 1).padStart(3, '0')}`,
      accountStatus: 'active',
      isActive: true,
      isFaceRegistered: true,
      faceDescriptors: Array.from({ length: 5 }, () => randomDescriptor()),
      faceRegisteredAt: new Date(),
    });
    students.push(student);
  }
  console.log('✅ 20 Students created (student1@saams.com to student20@saams.com / password123)');

  // 6. Create Courses
  const course1 = await Course.create({
    name: 'Data Structures & Algorithms', code: 'CS301', department: csDept._id,
    faculty: [faculty1._id], students: students.slice(0, 10).map(s => s._id),
    semester: '5', academicYear: '2025-26', isActive: true,
  });
  const course2 = await Course.create({
    name: 'Database Management Systems', code: 'CS302', department: csDept._id,
    faculty: [faculty1._id], students: students.slice(0, 10).map(s => s._id),
    semester: '5', academicYear: '2025-26', isActive: true,
  });
  const course3 = await Course.create({
    name: 'Digital Signal Processing', code: 'ECE401', department: eceDept._id,
    faculty: [faculty2._id], students: students.slice(10).map(s => s._id),
    semester: '7', academicYear: '2025-26', isActive: true,
  });
  console.log('✅ 3 Courses created');

  // 7. Create Sessions & Attendance
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const sessionDate = new Date(today);
    sessionDate.setDate(sessionDate.getDate() - i);

    for (const course of [course1, course2, course3]) {
      const session = await Session.create({
        course: course._id, faculty: course.faculty[0], date: sessionDate,
        startTime: new Date(sessionDate.setHours(9, 0, 0)),
        endTime: new Date(sessionDate.setHours(10, 0, 0)),
        attendanceMode: 'dual', status: i === 0 ? 'active' : 'closed',
        location: 'Room 101',
      });
      course.totalClasses += 1;
      await course.save();

      // Mark random attendance
      const courseStudents = course.students;
      const presentCount = Math.floor(courseStudents.length * (0.6 + Math.random() * 0.35));
      const shuffled = [...courseStudents].sort(() => Math.random() - 0.5);
      for (let j = 0; j < presentCount; j++) {
        await Attendance.create({
          session: session._id, course: course._id, student: shuffled[j],
          method: Math.random() > 0.5 ? 'qr' : 'facial',
          status: 'present', markedAt: new Date(sessionDate.getTime() + Math.random() * 3600000),
          faceMatchDistance: Math.random() * 0.5,
          faceMatchConfidence: 0.7 + Math.random() * 0.3,
        });
      }
    }
  }
  console.log('✅ 15 Sessions with attendance records created');

  console.log('\n🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Login credentials:');
  console.log('   Super Admin: superadmin@saams.com / password123');
  console.log('   Admin:       admin@saams.com / password123');
  console.log('   Faculty 1:   faculty1@saams.com / password123');
  console.log('   Faculty 2:   faculty2@saams.com / password123');
  console.log('   Students:    student1@saams.com to student20@saams.com / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
