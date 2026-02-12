import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma';
import profilesRouter from './app/profiles';
import designRouter from './app/design';
import irRouter from './app/ir';
import exportRouter from './app/export';
import modelsRouter from './app/models';
import settingsRouter from './app/settings';

const app = express();

const DEFAULT_PORT = 3001;
const MAX_JSON_BODY_SIZE = '1mb';

function resolvePort(rawPort: string | undefined): number {
  if (!rawPort) {
    return DEFAULT_PORT;
  }
  const parsed = Number.parseInt(rawPort, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`PORT is invalid: ${rawPort}`);
  }
  return parsed;
}

function resolveAllowedOrigins(rawOrigins: string | undefined): Set<string> | null {
  if (!rawOrigins) {
    return null;
  }
  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? new Set(origins) : null;
}

const PORT = resolvePort(process.env.PORT);
const allowedOrigins = resolveAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

app.disable('x-powered-by');

app.use(cors({
  origin(origin, callback) {
    if (!origin || !allowedOrigins || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin denied'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));

app.use(express.json({
  limit: MAX_JSON_BODY_SIZE,
  strict: true,
  type: 'application/json',
}));

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'JSON形式が不正です' });
    return;
  }
  if (error instanceof Error && error.message === 'CORS origin denied') {
    res.status(403).json({ error: '許可されていないオリジンです' });
    return;
  }
  next(error);
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/models', modelsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/design', designRouter);
app.use('/api/ir', irRouter);
app.use('/api/export', exportRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}
