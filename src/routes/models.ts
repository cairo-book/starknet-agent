import express from 'express';
import logger from '../utils/logger';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '../lib/providers';
import { isHostedMode } from '../config';

const router = express.Router();

router.get('/', async (req, res) => {
  if (isHostedMode()) {
    return res
      .status(403)
      .json({ error: 'This route is disabled in hosted mode' });
  }
  try {
    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    res.status(200).json({ chatModelProviders, embeddingModelProviders });
  } catch (err) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(err.message);
  }
});

export default router;
