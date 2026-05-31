import { Router } from 'express';
import { analyzePrompt, generateResponse } from '../controllers/grounding.controller';

const router = Router();

router.post('/analyze', analyzePrompt);
router.post('/generate', generateResponse);

export default router;
