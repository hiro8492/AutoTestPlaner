import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { handleRouteError, HttpError, parseUuidParam } from '../lib/http';
import { irSchema } from '../lib/ir-validation';

const router = Router();

const saveIRSchema = z.object({ ir: irSchema }).strict();

// POST /ir/:designId/save - Save user-edited IR
router.post('/:designId/save', async (req: Request, res: Response) => {
  try {
    const designId = parseUuidParam(req.params.designId, 'designId');
    const data = saveIRSchema.parse(req.body);

    const savedVersion = await prisma.$transaction(async (tx) => {
      const designJob = await tx.designJob.findUnique({ where: { id: designId } });
      if (!designJob) {
        throw new HttpError(404, 'Design not found');
      }

      const latestVersion = await tx.irVersion.findFirst({
        where: { designId },
        orderBy: { versionNo: 'desc' },
      });
      const nextVersion = latestVersion ? latestVersion.versionNo + 1 : 1;

      await tx.irVersion.create({
        data: {
          designId,
          versionNo: nextVersion,
          irJson: JSON.stringify(data.ir),
          editedBy: 'user',
        },
      });

      return nextVersion;
    });

    res.json({ version_no: savedVersion });
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: 'IRの保存に失敗しました',
      logPrefix: 'Failed to save IR:',
    });
  }
});

// GET /ir/:designId/latest - Get latest IR version
router.get('/:designId/latest', async (req: Request, res: Response) => {
  try {
    const designId = parseUuidParam(req.params.designId, 'designId');

    const latestVersion = await prisma.irVersion.findFirst({
      where: { designId },
      orderBy: { versionNo: 'desc' },
    });

    if (!latestVersion) {
      return res.status(404).json({ error: 'No IR versions found' });
    }

    const ir = irSchema.parse(JSON.parse(latestVersion.irJson));

    res.json({
      version_no: latestVersion.versionNo,
      ir,
    });
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: '最新IRの取得に失敗しました',
      logPrefix: 'Failed to fetch latest IR:',
    });
  }
});

export default router;
