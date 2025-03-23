const Joi = require('@hapi/joi');
const security = require('../config/security');

const passwordSchema = Joi.string()
  .min(security.password.minLength)
  .max(security.password.maxLength)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$'))
  .message({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    'string.min': `Password must be at least ${security.password.minLength} characters long`,
    'string.max': `Password cannot be longer than ${security.password.maxLength} characters`
  });

const validatePassword = (password) => {
  const requirements = {
    length: password.length >= security.password.minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const errors = [];

  if (!requirements.length) {
    errors.push(`Password must be at least ${security.password.minLength} characters long`);
  }

  if (security.password.requireUppercase && !requirements.uppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (security.password.requireLowercase && !requirements.lowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (security.password.requireNumbers && !requirements.numbers) {
    errors.push('Password must contain at least one number');
  }

  if (security.password.requireSymbols && !requirements.symbols) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements,
  };
};

module.exports = validatePassword;
