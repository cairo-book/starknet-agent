import express from 'express';
import configRouter from './config';
import modelsRouter from './models';
import suggestionsRouter from './suggestions';

const router = express.Router();

router.use('/config', configRouter);
router.use('/models', modelsRouter);
router.use('/suggestions', suggestionsRouter);

export default router;
