import { getIRSchema } from '../ir-schema';
import type { LLMProvider, LLMResult, ModelInfo, ProviderName, GenerateIRParams } from './types';
import { SYSTEM_PROMPT, buildUserPrompt, extractJson } from './prompts';
import { OllamaProvider } from './providers/ollama';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import { parseAndValidateModelId } from './model-id';

// Re-export for convenience
export type { ModelInfo, LLMResult, GenerateIRParams };

// ── Provider registry ───────────────────────────────────────────────────────

const providers: LLMProvider[] = [
  new OllamaProvider(),
  new OpenAIProvider(),
  new AnthropicProvider(),
  new GeminiProvider(),
];

// ── Parse model ID ──────────────────────────────────────────────────────────

export function parseModelId(modelId: string): { provider: ProviderName; model: string } {
  return parseAndValidateModelId(modelId);
}

// ── List all models ─────────────────────────────────────────────────────────

export async function listAllModels(): Promise<ModelInfo[]> {
  const available = providers.filter((p) => p.isAvailable());

  const results = await Promise.allSettled(
    available.map((p) => p.listModels()),
  );

  const models: ModelInfo[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      models.push(...result.value);
    } else {
      // Log but don't fail — other providers may still work
      console.warn('Failed to list models from a provider:', result.reason);
    }
  }
  return models;
}

// ── Call LLM ────────────────────────────────────────────────────────────────

export async function callLLM(params: GenerateIRParams): Promise<LLMResult> {
  const modelId = params.model?.trim() || 'ollama:phi4mini';
  const { provider: providerName, model } = parseModelId(modelId);

  const provider = providers.find((p) => p.name === providerName);
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${providerName}`);
  }
  if (!provider.isAvailable()) {
    throw new Error(`Provider "${providerName}" is not configured. Set the required API key.`);
  }

  const userPrompt = buildUserPrompt(params);
  const schema = getIRSchema();

  // Combine built-in system prompt with user's custom additions
  const systemPrompt = params.customSystemPrompt
    ? `${SYSTEM_PROMPT}\n\n# ユーザー追加指示\n${params.customSystemPrompt}`
    : SYSTEM_PROMPT;

  const { responseText, requestPayload } = await provider.generate(
    model,
    systemPrompt,
    userPrompt,
    schema,
  );

  // Extract and parse JSON (handles markdown fences, etc.)
  const jsonText = extractJson(responseText);
  let irJson: object;
  try {
    irJson = JSON.parse(jsonText);
  } catch (error: unknown) {
    throw new Error(
      `LLM returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    irJson,
    requestPayload,
    responseRaw: responseText,
    modelName: `${providerName}:${model}`,
  };
}
