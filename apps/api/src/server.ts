import mongoose from 'mongoose';
import { app } from './app.js';
import { env } from './config/env.js';

async function start(): Promise<void> {
  if (env.MONGODB_URI) {
    await mongoose.connect(env.MONGODB_URI);
    app.listen(env.PORT, () => {
      console.info(`CircuTrace API listening on port ${env.PORT}`);
    });
    return;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('MONGODB_URI is required in production.');
  }

  app.listen(env.PORT, () => {
    console.warn('MONGODB_URI is not set; starting API without database connectivity.');
    console.info(`CircuTrace API listening on port ${env.PORT}`);
  });
}

start().catch((error: unknown) => {
  console.error('Failed to start CircuTrace API', error);
  process.exitCode = 1;
});
