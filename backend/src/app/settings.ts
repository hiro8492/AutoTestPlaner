import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getLLMSettingsSummary, updateLLMSettings } from '../lib/llm/settings';
import { handleRouteError } from '../lib/http';

const router = Router();

const baseUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) {
      return true;
    }
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'openai_base_url は http(s) URL 形式で指定してください');

const updateLLMSettingsSchema = z.object({
  openai_api_key: z.string().max(500).optional(),
  openai_base_url: baseUrlSchema.optional(),
  gemini_api_key: z.string().max(500).optional(),
  anthropic_api_key: z.string().max(500).optional(),
}).strict();

// GET /settings/llm - Get LLM provider configuration status
router.get('/llm', (_req: Request, res: Response) => {
  try {
    res.json(getLLMSettingsSummary());
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: 'LLM設定の読み込みに失敗しました',
      logPrefix: 'Failed to load LLM settings:',
    });
  }
});

// PUT /settings/llm - Update LLM provider keys/settings
router.put('/llm', (req: Request, res: Response) => {
  try {
    const data = updateLLMSettingsSchema.parse(req.body);
    const summary = updateLLMSettings({
      openaiApiKey: data.openai_api_key,
      openaiBaseUrl: data.openai_base_url,
      geminiApiKey: data.gemini_api_key,
      anthropicApiKey: data.anthropic_api_key,
    });
    res.json(summary);
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: 'LLM設定の保存に失敗しました',
      logPrefix: 'Failed to update LLM settings:',
    });
  }
});

export default router;
