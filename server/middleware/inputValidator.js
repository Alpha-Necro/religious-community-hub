const security = require('../config/security');

const validateInput = (req, res, next) => {
  const { body } = req;
  const errors = [];

  // Validate email if present
  if (body.email) {
    if (typeof body.email !== 'string') {
      errors.push('Email must be a string');
    } else if (!security.validation.email.pattern.test(body.email)) {
      errors.push('Invalid email format');
    } else if (body.email.length < security.validation.email.min) {
      errors.push(`Email must be at least ${security.validation.email.min} characters`);
    } else if (body.email.length > security.validation.email.max) {
      errors.push(`Email cannot exceed ${security.validation.email.max} characters`);
    }
  }

  // Validate username if present
  if (body.username) {
    if (typeof body.username !== 'string') {
      errors.push('Username must be a string');
    } else if (!security.validation.username.pattern.test(body.username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    } else if (body.username.length < security.validation.username.min) {
      errors.push(`Username must be at least ${security.validation.username.min} characters`);
    } else if (body.username.length > security.validation.username.max) {
      errors.push(`Username cannot exceed ${security.validation.username.max} characters`);
    }
  }

  // Validate name if present
  if (body.name) {
    if (typeof body.name !== 'string') {
      errors.push('Name must be a string');
    } else if (!security.validation.name.pattern.test(body.name)) {
      errors.push('Name can only contain letters and spaces');
    } else if (body.name.length < security.validation.name.min) {
      errors.push(`Name must be at least ${security.validation.name.min} characters`);
    } else if (body.name.length > security.validation.name.max) {
      errors.push(`Name cannot exceed ${security.validation.name.max} characters`);
    }
  }

  // Validate password if present
  if (body.password) {
    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation error',
      details: errors
    });
  }

  next();
};

module.exports = validateInput;
