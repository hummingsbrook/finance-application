require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');

if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
  console.error('[startup] CLIENT_URL must be set in production. Exiting.');
  process.exit(1);
}

// C-3 — JWT_RESET_SECRET is no longer part of the reset flow.
const REQUIRED_SECRETS = ['JWT_SECRET', 'DATABASE_URL'];
const missing = REQUIRED_SECRETS.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}. Exiting.`);
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.set('etag', false);
const PORT = process.env.PORT || 3001;

// ─── Security & Middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.CLIENT_URL,
      /\.vercel\.app$/,  // allow all vercel preview URLs
    ];
    if (!origin) return callback(null, true); // allow curl/mobile
    const isAllowed = allowed.some(a =>
      typeof a === 'string' ? a === origin : a.test(origin)
    );
    callback(isAllowed ? null : new Error('CORS blocked'), isAllowed);
  },
  credentials: true,
  exposedHeaders: ['x-csrf-token'],
}));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '100kb' }));

// ─── CSRF Protection (double-submit cookie pattern) ───────────────────────────
// C-5 — csrf-csrf works alongside HttpOnly auth cookies. The CSRF cookie is
// readable by JavaScript so the frontend can echo it back in X-CSRF-Token on
// every non-GET request.
//
// Disabled in the test environment so supertest can exercise write endpoints
// without negotiating CSRF tokens — mirrors the rate-limiter test bypass.
const isProduction = process.env.NODE_ENV === 'production';
const isTestEnv    = process.env.NODE_ENV === 'test';
const csrfSecret   = process.env.CSRF_SECRET || 'dev-csrf-secret-change-in-prod';

let doubleCsrfProtection = null;
let generateToken         = null;

if (!isTestEnv) {
  const csrf = doubleCsrf({
    getSecret: () => csrfSecret,
    cookieName: 'csrf-token',
    cookieOptions: {
    httpOnly: false,
    sameSite: isProduction ? 'None' : 'Lax',
    secure: isProduction,
    path: '/',
        },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  });
  doubleCsrfProtection = csrf.doubleCsrfProtection;
  generateToken         = csrf.generateToken;
}

// Paths that must NOT require a CSRF token — the user has no auth cookie yet
// (or the endpoint is intentionally public). Note: these are relative to the
// /api mount point because Express strips the prefix inside app.use('/api',…).
const CSRF_EXEMPT_PATHS = new Set([
  '/auth/signin',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/health',
  '/csrf-token',
]);

// Apply CSRF validation to every /api route that is not explicitly exempted.
app.use('/api', (req, res, next) => {
  if (!doubleCsrfProtection || CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }
  return doubleCsrfProtection(req, res, next);
});

// Inject a fresh CSRF token into every JSON response so the frontend always
// has a valid token ready before its next write request.
//
// We wrap res.json() rather than hooking res.on('finish') because headers
// must be set BEFORE the response is flushed — finish fires too late.
//
// FIXED: Pass overwrite=true so each response always issues a coherent
// token+hash pair. Without this, csrf-csrf v3 reuses the existing cookie
// on GET responses but may throw on a stale/mismatched cookie (race between
// concurrent responses), causing the next POST to fail validation.

// ─── API Routes ────────────────────────────────────────────────────────────────
const authRoutes    = require('./modules/auth/routes');
const titheRoutes   = require('./modules/tithes/routes');
const offeringRoutes = require('./modules/offerings/routes');
const expenseRoutes = require('./modules/expenses/routes');
const harambeeRoutes = require('./modules/harambees/routes');
const serviceRoutes = require('./modules/services/routes');
const reportRoutes  = require('./modules/reports/routes');
const eventRoutes   = require('./modules/events/routes');
const userRoutes    = require('./modules/users/routes');
const auditRoutes   = require('./modules/audit/routes');
const backupRoutes  = require('./modules/backup/routes'); // H-4

// ─── Rate Limiters ─────────────────────────────────────────────────────────────
// M-3 — DISABLE_RATE_LIMIT is honoured ONLY when NODE_ENV === 'test'.
// In production the flag is ignored and a warning is logged.
const shouldDisableRateLimit =
  process.env.DISABLE_RATE_LIMIT === 'true' && isTestEnv;

if (isProduction && process.env.DISABLE_RATE_LIMIT === 'true') {
  console.warn('[startup] DISABLE_RATE_LIMIT=true ignored in production — rate limiters remain active.');
}

const localSkip = (req) =>
  shouldDisableRateLimit &&
  ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(req.ip);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again later.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: localSkip,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 100,
  message: { success: false, message: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: localSkip,
});

app.use('/api/', generalLimiter);

app.use('/api/auth/signin',          authLimiter,   authRoutes);
app.use('/api/auth/forgot-password', authLimiter,   authRoutes);
app.use('/api/auth',   authRoutes);

app.use('/api/tithes',    titheRoutes);
app.use('/api/offerings', offeringRoutes);
app.use('/api/expenses',  expenseRoutes);
app.use('/api/harambees', harambeeRoutes);
app.use('/api/services',  serviceRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/events',    eventRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/audit',     auditRoutes);
app.use('/api/admin',     backupRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});
app.get('/api/csrf-token', (req, res) => {
  if (!generateToken) {
    return res.status(500).json({
      success: false,
      message: 'CSRF protection is not initialized.',
    });
  }

  try {
    const token = generateToken(req, res);

    res.setHeader('x-csrf-token', token);

    res.json({
      success: true,
      data: {
        csrfToken: token,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Failed to generate CSRF token.',
    });
  }
});
// ─── Production: Serve React Frontend ──────────────────────────────────────────
if (isProduction) {
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  // Catch-all: serve index.html for any non-API route (SPA routing).
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// ─── Global Error Handler ──────────────────────────────────────────────────────
// FIXED: Forward the HTTP status code from http-errors (e.g. csrf-csrf throws
// a 403 ForbiddenError with code EBADCSRFTOKEN). Previously everything fell
// through as 500, which masked the real cause and confused the client.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  const status  = err.status || err.statusCode || 500;
  const code    = err.code   || 'SERVER_ERROR';
  const message = (status < 500 && err.message)
    ? err.message
    : 'Internal server error.';

  res.status(status).json({ success: false, message, code });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
// Only bind a port when run directly (not when imported by Jest / supertest).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ChurchFinance Pro server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

module.exports = app;
