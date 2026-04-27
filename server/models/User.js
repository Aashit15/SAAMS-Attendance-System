import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // don't return password by default
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'faculty', 'student'],
      default: 'student',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
    },
    rollNumber: {
      type: String,
      trim: true,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },

    // Face Recognition Fields (students only)
    faceDescriptors: {
      type: [[Number]], // Array of 5 × 128-float arrays
      default: [],
    },
    faceImageUrl: {
      type: String,
      default: '',
    },
    faceRegisteredAt: Date,
    isFaceRegistered: {
      type: Boolean,
      default: false,
    },

    // Account Status
    accountStatus: {
      type: String,
      enum: ['pending_face', 'active', 'suspended'],
      default: 'active',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      select: false,
    },

    // Face re-enrollment
    faceReEnrollToken: String,
    faceReEnrollTokenExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ isFaceRegistered: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
