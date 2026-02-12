import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

interface HandleRouteErrorOptions {
  defaultMessage?: string;
  logPrefix?: string;
}

export function handleRouteError(
  res: Response,
  error: unknown,
  options: HandleRouteErrorOptions = {},
): Response {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2025'
  ) {
    return res.status(404).json({ error: '対象データが見つかりません' });
  }

  console.error(options.logPrefix ?? 'Unhandled route error:', error);
  return res.status(500).json({
    error: options.defaultMessage ?? 'サーバーエラーが発生しました',
  });
}

export function parsePositiveIntParam(value: string, fieldName: string): number {
  const parsed = z.coerce.number().int().positive().safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, `${fieldName} は正の整数で指定してください`);
  }
  return parsed.data;
}

export function parseUuidParam(value: string, fieldName: string): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, `${fieldName} はUUID形式で指定してください`);
  }
  return parsed.data;
}
