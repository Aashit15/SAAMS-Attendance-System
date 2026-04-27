import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },

    // QR fields
    qrToken: String,
    qrExpiresAt: Date,

    // Attendance mode
    attendanceMode: {
      type: String,
      enum: ['qr', 'facial', 'dual'],
      default: 'dual',
    },

    status: {
      type: String,
      enum: ['active', 'closed', 'expired'],
      default: 'active',
    },
    location: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['in-person', 'online'],
      default: 'in-person',
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

sessionSchema.index({ course: 1, date: 1 });
sessionSchema.index({ qrToken: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ faculty: 1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
