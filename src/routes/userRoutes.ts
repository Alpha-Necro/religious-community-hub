import { Router } from 'express';
import { secureRoute } from '../middleware/routeSecurity';
import { userSchema, loginSchema } from '../utils/validation';

const router = Router();

// Secure route with authentication and rate limiting
router.post(
  '/register',
  secureRoute({
    validationSchema: {
      body: userSchema,
    },
    sanitize: {
      body: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  }),
  async (req, res) => {
    // Simulate user registration
    const { email, password, name } = req.body;
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        email,
        name,
        id: 'user-id-123',
      },
    });
  }
);

// Secure route with admin access
router.get(
  '/admin/dashboard',
  secureRoute({
    requireAuth: true,
    requireAdmin: true,
  }),
  async (req, res) => {
    res.json({
      message: 'Welcome to admin dashboard',
      user: req.user,
    });
  }
);

// Login route with rate limiting
router.post(
  '/login',
  secureRoute({
    validationSchema: {
      body: loginSchema,
    },
    sanitize: {
      body: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 login attempts per windowMs
    },
  }),
  async (req, res) => {
    const { email, password } = req.body;
    res.json({
      message: 'Login successful',
      token: 'jwt-token-here',
      user: {
        email,
        id: 'user-id-123',
      },
    });
  }
);

export default router;
