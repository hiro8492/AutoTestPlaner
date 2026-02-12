import fs from 'fs';
import path from 'path';
import { assertValidUrl } from './http-client';

export interface LLMSettings {
  openaiApiKey: string;
  openaiBaseUrl: string;
  geminiApiKey: string;
  anthropicApiKey: string;
}

export interface LLMSettingsSummary {
  openai: {
    configured: boolean;
    baseUrl: string;
  };
  gemini: {
    configured: boolean;
  };
  anthropic: {
    configured: boolean;
  };
}

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com';

let cache: LLMSettings | null = null;

function normalizeOpenAIBaseUrl(value: string | undefined): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return DEFAULT_OPENAI_BASE_URL;
  }
  return assertValidUrl(trimmed, 'openaiBaseUrl');
}

function decodeSqliteFilePath(databaseUrl: string): string | null {
  if (!databaseUrl.startsWith('file:')) return null;

  let raw = databaseUrl.slice('file:'.length);
  raw = decodeURIComponent(raw);

  if (process.platform === 'win32' && /^\/[A-Za-z]:\//.test(raw)) {
    raw = raw.slice(1);
  }

  return raw.replace(/\//g, path.sep);
}

function resolveSettingsPath(): string {
  if (process.env.LLM_SETTINGS_PATH) {
    return path.resolve(process.env.LLM_SETTINGS_PATH);
  }

  const dbPath = process.env.DATABASE_URL
    ? decodeSqliteFilePath(process.env.DATABASE_URL)
    : null;
  if (dbPath) {
    return path.join(path.dirname(dbPath), 'llm-settings.json');
  }

  return path.resolve(process.cwd(), 'llm-settings.json');
}

function loadFromDisk(settingsPath: string): Partial<LLMSettings> {
  if (!fs.existsSync(settingsPath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LLMSettings>;
    return parsed;
  } catch (e) {
    console.warn(`Failed to read LLM settings file: ${settingsPath}`, e);
    return {};
  }
}

function writeToDisk(settingsPath: string, settings: LLMSettings): void {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

export function getLLMSettings(): LLMSettings {
  if (cache) return cache;

  const settingsPath = resolveSettingsPath();
  const fileSettings = loadFromDisk(settingsPath);

  cache = {
    openaiApiKey: fileSettings.openaiApiKey ?? process.env.OPENAI_API_KEY ?? '',
    openaiBaseUrl: normalizeOpenAIBaseUrl(
      fileSettings.openaiBaseUrl ?? process.env.OPENAI_BASE_URL,
    ),
    geminiApiKey: fileSettings.geminiApiKey ?? process.env.GEMINI_API_KEY ?? '',
    anthropicApiKey: fileSettings.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
  };

  return cache;
}

export function getLLMSettingsSummary(): LLMSettingsSummary {
  const settings = getLLMSettings();
  return {
    openai: {
      configured: settings.openaiApiKey.length > 0,
      baseUrl: settings.openaiBaseUrl,
    },
    gemini: {
      configured: settings.geminiApiKey.length > 0,
    },
    anthropic: {
      configured: settings.anthropicApiKey.length > 0,
    },
  };
}

export function updateLLMSettings(input: {
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
}): LLMSettingsSummary {
  const current = getLLMSettings();

  const next: LLMSettings = {
    openaiApiKey:
      input.openaiApiKey !== undefined ? input.openaiApiKey.trim() : current.openaiApiKey,
    openaiBaseUrl:
      input.openaiBaseUrl !== undefined
        ? normalizeOpenAIBaseUrl(input.openaiBaseUrl)
        : current.openaiBaseUrl,
    geminiApiKey:
      input.geminiApiKey !== undefined ? input.geminiApiKey.trim() : current.geminiApiKey,
    anthropicApiKey:
      input.anthropicApiKey !== undefined
        ? input.anthropicApiKey.trim()
        : current.anthropicApiKey,
  };

  const settingsPath = resolveSettingsPath();
  writeToDisk(settingsPath, next);
  cache = next;

  return getLLMSettingsSummary();
}
