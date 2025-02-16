import { startWebSocketServer } from './websocket';
import express from 'express';
import cors from 'cors';
import http from 'http';
import routes from './routes';
import { getPort } from './config';
import logger from './utils/logger';
import { initializeLLMConfig } from './lib/modelProviderService';

const port = getPort();

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: '*',
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Initialize LLM models before mounting routes
const initializeApp = async () => {
  try {
    // Initialize LLM models using the centralized service
    const modelConfig = await initializeLLMConfig();

    // Store LLM instances in app.locals for use in routes
    app.locals.defaultLLM = modelConfig.defaultLLM;
    app.locals.fastLLM = modelConfig.fastLLM;
    app.locals.embeddings = modelConfig.embeddings;

    // Mount routes after LLM initialization
    app.use('/', routes);
    app.get('/', (_, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Start server
    server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    startWebSocketServer(server);
  } catch (error) {
    logger.error('Failed to initialize app:', error);
    process.exit(1);
  }
};

// Error handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error('Express error handler:', err);
    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        type: 'server_error',
      },
    });
  },
);

process.on('uncaughtException', (err, origin) => {
  logger.error(`Uncaught Exception at ${origin}: ${err}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Start the application
initializeApp();
