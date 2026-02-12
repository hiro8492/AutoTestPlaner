import { Router, Request, Response } from 'express';
import { listAllModels } from '../lib/llm/registry';
import { handleRouteError } from '../lib/http';

const router = Router();

// GET /models - List available LLM models (all providers)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const models = await listAllModels();
    res.json(models);
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: 'モデル一覧を取得できません',
      logPrefix: 'Failed to fetch models:',
    });
  }
});

export default router;
