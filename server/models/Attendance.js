import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ['qr', 'manual', 'facial'],
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },
    faceMatchConfidence: Number,
    faceMatchDistance: Number,
    ipAddress: String,
    deviceInfo: String,
    isProxy: {
      type: Boolean,
      default: false,
    },
    proxyFlagReason: String,
  },
  { timestamps: true }
);

// Compound unique index: one attendance per student per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceSchema.index({ course: 1 });
attendanceSchema.index({ student: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
