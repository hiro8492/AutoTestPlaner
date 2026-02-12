import { CoverageRule } from '../rules';

// ── Provider Names ──────────────────────────────────────────────────────────

export type ProviderName = 'ollama' | 'openai' | 'anthropic' | 'gemini';

// ── Model Info (returned to frontend) ───────────────────────────────────────

export interface ModelInfo {
  id: string;          // "provider:model_name"
  name: string;        // display name
  provider: ProviderName;
  size?: number;       // bytes – only Ollama provides this
}

// ── LLM call result ─────────────────────────────────────────────────────────

export interface LLMResult {
  irJson: object;
  requestPayload: object;
  responseRaw: string;
  modelName: string;   // "provider:model_name"
}

// ── Generation parameters ───────────────────────────────────────────────────

export interface GenerateIRParams {
  suiteName: string;
  coverageLevel: CoverageRule['level'];
  elementStepsText: string;
  specText: string;
  terminologyText: string;
  styleText: string;
  customSystemPrompt: string;
  testTechniques: string[];
  rule: CoverageRule;
  model?: string;       // "provider:model_name" or bare name (Ollama fallback)
}

// ── Provider adapter interface ──────────────────────────────────────────────

export interface LLMProvider {
  readonly name: ProviderName;

  /** Whether this provider is configured (API key set, etc.) */
  isAvailable(): boolean;

  /** List models offered by this provider */
  listModels(): Promise<ModelInfo[]>;

  /** Call the LLM and return structured IR JSON */
  generate(
    model: string,            // bare model name (without provider prefix)
    systemPrompt: string,
    userPrompt: string,
    schema: object,           // JSON Schema for structured output
  ): Promise<{ responseText: string; requestPayload: object }>;
}
