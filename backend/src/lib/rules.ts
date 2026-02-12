import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { coverageLevelSchema } from './ir-validation';

export interface CoverageRule {
  level: 'smoke' | 'regression' | 'full';
  description: string;
  constraints: {
    max_steps_per_case: number;
  };
  must_include: string[];
  avoid: string[];
  recommended_tags: string[];
  priority_policy: {
    default: string;
    rules: Array<{ condition: string; priority: string }>;
  };
}

const rulesDir = path.resolve(__dirname, '../../../rules');

const coverageRuleSchema = z.object({
  level: coverageLevelSchema,
  description: z.string(),
  constraints: z.object({
    max_steps_per_case: z.number().int().positive(),
  }),
  must_include: z.array(z.string()),
  avoid: z.array(z.string()),
  recommended_tags: z.array(z.string()),
  priority_policy: z.object({
    default: z.string(),
    rules: z.array(z.object({
      condition: z.string(),
      priority: z.string(),
    })),
  }),
}).strict();

export function loadRule(coverageLevel: CoverageRule['level']): CoverageRule {
  const filePath = path.join(rulesDir, `coverage_${coverageLevel}.yaml`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Coverage rule file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsedYaml = yaml.load(content);
  return coverageRuleSchema.parse(parsedYaml);
}

export function ruleToText(rule: CoverageRule): string {
  const lines: string[] = [];
  lines.push(`テスト度合い: ${rule.level}`);
  lines.push(`説明: ${rule.description.trim()}`);
  lines.push(`制約:`);
  lines.push(`  - ケースあたり最大ステップ数: ${rule.constraints.max_steps_per_case}`);
  lines.push(`含めるべき観点:`);
  for (const item of rule.must_include) {
    lines.push(`  - ${item}`);
  }
  lines.push(`避けるべき観点:`);
  for (const item of rule.avoid) {
    lines.push(`  - ${item}`);
  }
  lines.push(`推奨タグ: ${rule.recommended_tags.join(', ')}`);
  lines.push(`優先度ポリシー:`);
  lines.push(`  デフォルト: ${rule.priority_policy.default}`);
  for (const r of rule.priority_policy.rules) {
    lines.push(`  - 条件「${r.condition}」→ ${r.priority}`);
  }
  return lines.join('\n');
}
