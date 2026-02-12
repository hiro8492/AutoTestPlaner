import type { ProviderName } from './types';

const allowedProviders = new Set<ProviderName>(['ollama', 'openai', 'anthropic', 'gemini']);
const modelNamePattern = /^[A-Za-z0-9._:/+-]+$/;

export function parseAndValidateModelId(modelIdRaw: string): { provider: ProviderName; model: string } {
  const modelId = modelIdRaw.trim();
  if (!modelId) {
    throw new Error('Model ID is empty');
  }

  const separatorIndex = modelId.indexOf(':');
  if (separatorIndex <= 0) {
    validateModelName(modelId);
    return { provider: 'ollama', model: modelId };
  }

  const providerRaw = modelId.slice(0, separatorIndex);
  const model = modelId.slice(separatorIndex + 1).trim();

  if (!allowedProviders.has(providerRaw as ProviderName)) {
    throw new Error(`Unknown LLM provider: ${providerRaw}`);
  }

  validateModelName(model);
  return {
    provider: providerRaw as ProviderName,
    model,
  };
}

function validateModelName(value: string): void {
  if (!value) {
    throw new Error('Model name is empty');
  }
  if (value.length > 200) {
    throw new Error('Model name is too long');
  }
  if (!modelNamePattern.test(value)) {
    throw new Error('Model name contains invalid characters');
  }
}
