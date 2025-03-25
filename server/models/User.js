const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      len: [5, 255]
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100]
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'superadmin'),
    defaultValue: 'user',
    validate: {
      isIn: [['user', 'admin', 'superadmin']]
    }
  },
  language: {
    type: DataTypes.ENUM('en', 'ar'),
    defaultValue: 'en',
    validate: {
      isIn: [['en', 'ar']]
    }
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordChangedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failedLoginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastFailedLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  accountLockedUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordHistory: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  rowLevelSecurity: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  dataMasking: {
    type: DataTypes.JSON,
    defaultValue: {
      email: true,
      phone: true,
      address: true
    }
  },
  mfaEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mfaSecret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mfaRecoveryCodes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  deviceFingerprint: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastLoginLocation: {
    type: DataTypes.JSON,
    allowNull: true
  },
  lastPasswordReset: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sessionTokens: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  lastSessionCleanup: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lockReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  securityQuestions: {
    type: DataTypes.JSON,
    allowNull: true
  },
  accountRecovery: {
    type: DataTypes.JSON,
    allowNull: true
  },
  lastSecurityCheck: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['accountLockedUntil'] },
    { fields: ['passwordChangedAt'] },
    { fields: ['lastLogin'] },
    { fields: ['isLocked'] },
    { fields: ['mfaEnabled'] },
    { fields: ['isVerified'] }
  ]
});

// Password validation
User.prototype.validatePassword = async function(password) {
  // Check password strength
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    throw new Error('Password must contain uppercase, lowercase, number, and special character');
  }

  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters long');
  }

  return bcrypt.compare(password, this.password);
};

// Password change
User.prototype.changePassword = async function(newPassword) {
  // Check password strength
  await this.validatePassword(newPassword);

  // Check if password has been used before
  if (this.passwordHistory?.includes(this.password)) {
    throw new Error('Cannot reuse previous password');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password and history
  await this.update({
    password: hashedPassword,
    passwordChangedAt: new Date(),
    passwordHistory: [...(this.passwordHistory || []), this.password].slice(-5),
    lastPasswordReset: new Date(),
    passwordResetToken: null,
    passwordResetExpires: null
  });
};

// MFA setup
User.prototype.setupMFA = async function(secret) {
  await this.update({
    mfaEnabled: true,
    mfaSecret: secret,
    mfaRecoveryCodes: this.generateRecoveryCodes()
  });
};

// MFA verification
User.prototype.verifyMFA = async function(code) {
  if (!this.mfaEnabled) {
    throw new Error('MFA is not enabled');
  }

  const isValid = this.mfaRecoveryCodes.includes(code);
  if (!isValid) {
    throw new Error('Invalid MFA code');
  }

  // Remove used recovery code
  await this.update({
    mfaRecoveryCodes: this.mfaRecoveryCodes.filter((c) => c !== code)
  });
};

// Generate recovery codes
User.prototype.generateRecoveryCodes = function() {
  const codes = [];
  for (let i = 0; i < 5; i++) {
    codes.push(Math.random().toString(36).substr(2, 8));
  }
  return codes;
};

// Login attempt tracking
User.prototype.trackLoginAttempt = async function(success, req) {
  if (success) {
    await this.update({
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      accountLockedUntil: null,
      lastLogin: new Date(),
      deviceFingerprint: req.deviceFingerprint,
      lastLoginLocation: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
  } else {
    const failedAttempts = this.failedLoginAttempts + 1;
    const lockoutDuration = Math.min(30, Math.floor(failedAttempts / 3) * 5); // 5, 10, 15, 20, 25, 30 minutes
    
    await this.update({
      failedLoginAttempts: failedAttempts,
      lastFailedLogin: new Date(),
      accountLockedUntil: failedAttempts >= 3 ? new Date(Date.now() + lockoutDuration * 60000) : null
    });
  }
};

// Check account lockout
User.prototype.isLocked = async function() {
  return this.accountLockedUntil && this.accountLockedUntil > new Date();
};

// Row-level security
User.beforeFind((options) => {
  if (options.where) {
    options.where = {
      ...options.where,
      rowLevelSecurity: true,
      isLocked: false
    };
  }
});

module.exports = User;
