const bcrypt = require('bcryptjs');
const Joi = require('@hapi/joi');
const security = require('../config/security');

// Password validation rules
const passwordRules = {
  min_length: security.password.minLength,
  max_length: security.password.maxLength,
  requires_lowercase: security.password.requireLowercase,
  requires_uppercase: security.password.requireUppercase,
  requires_number: security.password.requireNumbers,
  requires_special_char: security.password.requireSymbols,
  special_chars: '!@#$%^&*()_+{}[]|;:,.<>?',
};

// Validate password
const validatePassword = (password) => {
  const errors = [];

  // Check length
  if (password.length < passwordRules.min_length) {
    errors.push(`Password must be at least ${passwordRules.min_length} characters`);
  }
  if (password.length > passwordRules.max_length) {
    errors.push(`Password must be at most ${passwordRules.max_length} characters`);
  }

  // Check requirements
  if (passwordRules.requires_lowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (passwordRules.requires_uppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (passwordRules.requires_number && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (passwordRules.requires_special_char && !/[!@#$%^&*()_+{}\[\]|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
};

// Hash password
const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    throw new Error('Password hashing failed');
  }
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Password validation middleware
const passwordValidation = [
  (req, res, next) => {
    const { password } = req.body;
    const errors = validatePassword(password);
    
    if (errors.length > 0) {
      return res.status(400).json({
        errors: errors,
        passwordRules: {
          min_length: passwordRules.min_length,
          max_length: passwordRules.max_length,
          requires_lowercase: passwordRules.requires_lowercase,
          requires_uppercase: passwordRules.requires_uppercase,
          requires_number: passwordRules.requires_number,
          requires_special_char: passwordRules.requires_special_char,
        },
      });
    }
    next();
  },
];

// Password schema for Joi validation
const passwordSchema = Joi.string()
  .min(passwordRules.min_length)
  .max(passwordRules.max_length)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]*$'))
  .message({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    'string.min': `Password must be at least ${passwordRules.min_length} characters long`,
    'string.max': `Password cannot be longer than ${passwordRules.max_length} characters`
  });

module.exports = {
  validatePassword,
  hashPassword,
  comparePassword,
  passwordValidation,
  passwordRules,
  passwordSchema,
};
