import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { handleRouteError, parsePositiveIntParam } from '../lib/http';

const router = Router();

const profileTextSchema = z.string().max(20_000);

const profileCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  terminology_text: profileTextSchema.optional().default(''),
  style_text: profileTextSchema.optional().default(''),
  custom_system_prompt: profileTextSchema.optional().default(''),
}).strict();

const profileUpdateSchema = profileCreateSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: '更新項目がありません',
  });

function mapProfileToResponse(profile: {
  id: number;
  name: string;
  terminologyText: string;
  styleText: string;
  customSystemPrompt: string;
}): {
  id: string;
  name: string;
  terminology_text: string;
  style_text: string;
  custom_system_prompt: string;
} {
  return {
    id: String(profile.id),
    name: profile.name,
    terminology_text: profile.terminologyText,
    style_text: profile.styleText,
    custom_system_prompt: profile.customSystemPrompt,
  };
}

// GET /profiles - List all profiles
router.get('/', async (_req: Request, res: Response) => {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    const mapped = profiles.map(mapProfileToResponse);
    res.json(mapped);
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: 'プロファイル一覧の取得に失敗しました',
      logPrefix: 'Failed to list profiles:',
    });
  }
});

// POST /profiles - Create a new profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = profileCreateSchema.parse(req.body);
    const profile = await prisma.profile.create({
      data: {
        name: data.name,
        terminologyText: data.terminology_text,
        styleText: data.style_text,
        customSystemPrompt: data.custom_system_prompt,
      },
    });
    res.status(201).json({ id: String(profile.id) });
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: 'プロファイルの作成に失敗しました',
      logPrefix: 'Failed to create profile:',
    });
  }
});

// GET /profiles/:id - Get a profile by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parsePositiveIntParam(req.params.id, 'id');
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(mapProfileToResponse(profile));
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: 'プロファイルの取得に失敗しました',
      logPrefix: 'Failed to get profile:',
    });
  }
});

// PUT /profiles/:id - Update a profile
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parsePositiveIntParam(req.params.id, 'id');
    const data = profileUpdateSchema.parse(req.body);

    const updateData: {
      name?: string;
      terminologyText?: string;
      styleText?: string;
      customSystemPrompt?: string;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.terminology_text !== undefined) updateData.terminologyText = data.terminology_text;
    if (data.style_text !== undefined) updateData.styleText = data.style_text;
    if (data.custom_system_prompt !== undefined) updateData.customSystemPrompt = data.custom_system_prompt;

    const profile = await prisma.profile.update({ where: { id }, data: updateData });
    res.json({ id: String(profile.id) });
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: 'プロファイルの更新に失敗しました',
      logPrefix: 'Failed to update profile:',
    });
  }
});

export default router;
