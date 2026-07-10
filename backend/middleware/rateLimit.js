const rateLimit = require('express-rate-limit');

/**
 * Global rate limiter — applied to all routes.
 * 100 requests per 15 minutes per IP.
 */
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * Strict rate limiter for verification endpoints.
 * 20 verification attempts per 15 minutes per IP.
 * Prevents bulk enumeration of document IDs.
 */
const verifyLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max:      parseInt(process.env.VERIFY_RATE_LIMIT_MAX || '20'),
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Verification limit exceeded. Please wait 15 minutes before trying again.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * Auth-specific limiter — 10 login attempts per 15 min per IP.
 * Prevents brute-force attacks on login.
 */
const authLimiter = rateLimit({
  windowMs: 900000,
  max: 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = { globalLimiter, verifyLimiter, authLimiter };
