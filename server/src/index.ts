import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './prisma/client.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API listening');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');

  server.close((closeErr) => {
    if (closeErr) {
      logger.error({ err: closeErr }, 'Error while closing HTTP server');
    }

    void prisma
      .$disconnect()
      .catch((err: unknown) => {
        logger.error({ err }, 'Error while disconnecting Prisma');
      })
      .finally(() => {
        process.exit(closeErr ? 1 : 0);
      });
  });

  setTimeout(() => {
    logger.fatal('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  void shutdown('uncaughtException');
});
