const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

// Input validation rules
const validationRules = {
  // Common fields
  email: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail(),
  ],
  username: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
  ],
  name: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
  ],
  password: [
    body('password')
      .trim()
      .isLength({ min: 8, max: 100 })
      .withMessage('Password must be between 8 and 100 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]*$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],
  
  // Event fields
  eventTitle: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Event title must be between 5 and 100 characters'),
  ],
  eventDescription: [
    body('description')
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Event description must be between 10 and 5000 characters'),
  ],
  
  // Forum post fields
  postTitle: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 150 })
      .withMessage('Post title must be between 5 and 150 characters'),
  ],
  postContent: [
    body('content')
      .trim()
      .isLength({ min: 10, max: 10000 })
      .withMessage('Post content must be between 10 and 10000 characters'),
  ],
};

// Sanitize HTML input
const sanitizeInput = (input) => {
  return sanitizeHtml(input, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    allowedAttributes: {
      a: ['href', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
};

// Validation middleware
const validate = (rules) => {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    },
  ];
};

// Sanitization middleware
const sanitize = (fields) => {
  return (req, res, next) => {
    fields.forEach((field) => {
      if (req.body[field]) {
        req.body[field] = sanitizeInput(req.body[field]);
      }
    });
    next();
  };
};

module.exports = {
  validationRules,
  validate,
  sanitize,
  sanitizeInput,
};
