// ─────────────────────────────────────────────────────────────
//  models/user.model.js — USER SCHEMA
//  Password hashing happens HERE (pre-save hook) via the shared
//  password.service, so no service can ever forget to hash. The
//  toJSON transform guarantees the hash never leaks in responses.
// ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
const passwordService = require('../services/password.service');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // creates a unique index → duplicate register = 409
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // never included in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isEmailVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

// Hash the password automatically whenever it is created or changed
// (register, password reset, change-password). bcrypt cost 12.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await passwordService.hashPassword(this.password);
  next();
});

// Instance method: compare a plaintext password with the stored hash.
userSchema.methods.comparePassword = function comparePassword(plain) {
  return passwordService.comparePassword(plain, this.password);
};

// Strip secrets before any JSON serialisation (register, login, /me...).
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
