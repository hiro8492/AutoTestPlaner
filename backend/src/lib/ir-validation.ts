import { z } from 'zod';

export const coverageLevelSchema = z.enum(['smoke', 'regression', 'full']);

export const prioritySchema = z.enum(['High', 'Medium', 'Low']);

const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);

export const irSuiteSchema = z.object({
  name: nonEmptyText(200),
  coverage_level: coverageLevelSchema,
  assumptions: z.array(nonEmptyText(500)).max(100).optional(),
  notes: z.string().max(5000).optional(),
}).strict();

const irRowBaseShape = {
  Case: nonEmptyText(300),
  Step: nonEmptyText(5000),
  Expected: nonEmptyText(5000),
  Tag: z.string().trim().max(300),
  Priority: prioritySchema,
  remarks: z.string().trim().max(5000),
};

export const irRowSchema = z.object({
  id: nonEmptyText(64),
  ...irRowBaseShape,
}).strict();

export const irRowForGenerationSchema = z.object({
  id: z.string().trim().max(64).optional(),
  ...irRowBaseShape,
}).strict();

export const irSchema = z.object({
  suite: irSuiteSchema,
  rows: z.array(irRowSchema).max(5000),
}).strict();

export const generatedIrSchema = z.object({
  suite: irSuiteSchema,
  rows: z.array(irRowForGenerationSchema).max(5000),
}).strict();
