import type { LLMProvider, ModelInfo } from '../types';
import { fetchWithTimeout, readErrorBody } from '../http-client';

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama' as const;

  isAvailable(): boolean {
    // Ollama is always "available" — it just may not be running
    return true;
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetchWithTimeout(`${OLLAMA_BASE}/api/tags`, {}, {
      errorLabel: 'Ollama list models request failed',
    });
    if (!response.ok) {
      const text = await readErrorBody(response);
      throw new Error(`Ollama API error ${response.status}: ${text}`);
    }
    const data = (await response.json()) as { models?: any[] };
    return (data.models || []).map((m: any) => ({
      id: `ollama:${m.name}`,
      name: m.name,
      provider: 'ollama' as const,
      size: m.size,
    }));
  }

  async generate(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    schema: object,
  ): Promise<{ responseText: string; requestPayload: object }> {
    const requestPayload = {
      model,
      system: systemPrompt,
      prompt: userPrompt,
      format: schema,
      stream: false,
      options: {
        temperature: 0.2,
        num_ctx: 8192,
      },
    };

    const response = await fetchWithTimeout(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    }, {
      errorLabel: 'Ollama generate request failed',
    });

    if (!response.ok) {
      const text = await readErrorBody(response);
      throw new Error(`Ollama API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    return { responseText: data.response, requestPayload };
  }
}
