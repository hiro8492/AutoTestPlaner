import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { loadRule, ruleToText } from '../lib/rules';
import { callLLM } from '../lib/llm/registry';
import { generatedIrSchema } from '../lib/ir-validation';
import { handleRouteError, parsePositiveIntParam } from '../lib/http';

const router = Router();

const designRequestSchema = z.object({
  profile_id: z.string().trim().min(1),
  suite_name: z.string().trim().min(1).max(200),
  coverage_level: z.enum(['smoke', 'regression', 'full']),
  element_steps_text: z.string().trim().min(1).max(20_000),
  spec_text: z.string().max(20_000).optional().default(''),
  model: z.string().trim().max(300).optional(),
  test_techniques: z.array(z.string().trim().min(1).max(200)).max(50).optional().default([]),
}).strict();

function uid(): string {
  return `row_${Math.random().toString(36).slice(2, 10)}`;
}

/** Map test-type tag to sort order: normal=0, semi-normal=1, abnormal=2, unknown=1 */
function testTypeOrder(tag: string): number {
  const tags = tag.split('|').map((t) => t.trim());
  if (tags.includes('normal')) return 0;
  if (tags.includes('semi-normal')) return 1;
  if (tags.includes('abnormal')) return 2;
  return 1; // default to semi-normal if untagged
}

/** Sort rows: normal → semi-normal → abnormal, preserving Case grouping within each type */
function sortRowsByTestType(rows: any[]): any[] {
  return [...rows].sort((a, b) => {
    const typeA = testTypeOrder(a.Tag || '');
    const typeB = testTypeOrder(b.Tag || '');
    if (typeA !== typeB) return typeA - typeB;
    // Within same type, group by Case name
    return (a.Case || '').localeCompare(b.Case || '', 'ja');
  });
}

type GeneratedIR = z.infer<typeof generatedIrSchema>;

async function generateDesignWithRetry(input: {
  suiteName: string;
  coverageLevel: 'smoke' | 'regression' | 'full';
  elementStepsText: string;
  specText: string;
  terminologyText: string;
  styleText: string;
  customSystemPrompt: string;
  testTechniques: string[];
  rule: ReturnType<typeof loadRule>;
  model?: string;
}): Promise<Awaited<ReturnType<typeof callLLM>>> {
  try {
    return await callLLM(input);
  } catch (firstError) {
    console.warn('LLM first attempt failed, retrying...', firstError);
    return callLLM(input);
  }
}

// POST /design - Generate test design IR via LLM
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = designRequestSchema.parse(req.body);

    // Load profile
    const profileId = parsePositiveIntParam(data.profile_id, 'profile_id');
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Load coverage rules
    const rule = loadRule(data.coverage_level);
    const rulesText = ruleToText(rule);

    const llmInput = {
      suiteName: data.suite_name,
      coverageLevel: data.coverage_level,
      elementStepsText: data.element_steps_text,
      specText: data.spec_text,
      terminologyText: profile.terminologyText,
      styleText: profile.styleText,
      customSystemPrompt: profile.customSystemPrompt,
      testTechniques: data.test_techniques,
      rule,
      model: data.model,
    };

    let result: Awaited<ReturnType<typeof callLLM>>;

    try {
      result = await generateDesignWithRetry(llmInput);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown LLM error';
      await prisma.designJob.create({
        data: {
          profileId: profile.id,
          suiteName: data.suite_name,
          coverageLevel: data.coverage_level,
          elementStepsText: data.element_steps_text,
          specText: data.spec_text,
          rulesSnapshotText: rulesText,
          status: 'error',
          llmResponseJson: message,
        },
      });
      return res.status(502).json({ error: `LLM generation failed: ${message}` });
    }

    let generatedIR: GeneratedIR;
    try {
      generatedIR = generatedIrSchema.parse(result.irJson) as GeneratedIR;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid LLM response payload';
      await prisma.designJob.create({
        data: {
          profileId: profile.id,
          suiteName: data.suite_name,
          coverageLevel: data.coverage_level,
          elementStepsText: data.element_steps_text,
          specText: data.spec_text,
          rulesSnapshotText: rulesText,
          status: 'error',
          llmModelName: result.modelName,
          llmRequestJson: JSON.stringify(result.requestPayload),
          llmResponseJson: result.responseRaw,
        },
      });
      return res.status(502).json({
        error: `LLM response validation failed: ${message}`,
      });
    }
    const sortedRows = sortRowsByTestType(generatedIR.rows).map((row) => ({
      id: uid(),
      ...row,
    }));

    const irJson = {
      suite: generatedIR.suite,
      rows: sortedRows,
    };

    // Sort rows: normal → semi-normal → abnormal, then add client-side IDs
    // (rows are always present by schema)

    // Save design job
    const designJob = await prisma.designJob.create({
      data: {
        profileId: profile.id,
        suiteName: data.suite_name,
        coverageLevel: data.coverage_level,
        elementStepsText: data.element_steps_text,
        specText: data.spec_text,
        rulesSnapshotText: rulesText,
        llmModelName: result.modelName,
        llmRequestJson: JSON.stringify(result.requestPayload),
        llmResponseJson: result.responseRaw,
        status: 'success',
      },
    });

    // Save initial IR version
    await prisma.irVersion.create({
      data: {
        designId: designJob.id,
        versionNo: 1,
        irJson: JSON.stringify(irJson),
        editedBy: 'llm',
      },
    });

    res.json({
      design_id: designJob.id,
      ir: irJson,
    });
  } catch (error: unknown) {
    handleRouteError(res, error, {
      defaultMessage: '設計生成に失敗しました',
      logPrefix: 'Design generation error:',
    });
  }
});

export default router;
