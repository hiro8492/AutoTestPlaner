import type { LLMProvider, ModelInfo } from '../types';
import { getLLMSettings } from '../settings';
import { fetchWithTimeout, readErrorBody } from '../http-client';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const;

  isAvailable(): boolean {
    return getLLMSettings().geminiApiKey.length > 0;
  }

  async listModels(): Promise<ModelInfo[]> {
    const { geminiApiKey } = getLLMSettings();
    if (!geminiApiKey) {
      return [];
    }

    const models: ModelInfo[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;

    while (pageCount < 5) {
      const url = new URL(`${GEMINI_BASE}/models`);
      url.searchParams.set('key', geminiApiKey);
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await fetchWithTimeout(url.toString(), {}, {
        errorLabel: 'Gemini list models request failed',
      });
      if (!response.ok) {
        const text = await readErrorBody(response);
        throw new Error(`Gemini list models error ${response.status}: ${text}`);
      }

      const data = (await response.json()) as {
        models?: Array<{
          name?: string;
          baseModelId?: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
        }>;
        nextPageToken?: string;
      };

      for (const m of data.models || []) {
        const methods = m.supportedGenerationMethods || [];
        if (!methods.includes('generateContent')) continue;

        const fullName = m.name || '';
        const baseModelId = m.baseModelId || fullName.replace(/^models\//, '');
        if (!baseModelId) continue;

        models.push({
          id: `gemini:${baseModelId}`,
          name: m.displayName || baseModelId,
          provider: 'gemini',
        });
      }

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
      pageCount += 1;
    }

    const dedup = new Map<string, ModelInfo>();
    for (const m of models) {
      dedup.set(m.id, m);
    }
    return [...dedup.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async generate(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    schema: object,
  ): Promise<{ responseText: string; requestPayload: object }> {
    const { geminiApiKey } = getLLMSettings();
    if (!geminiApiKey) {
      throw new Error('Gemini APIキーが設定されていません。');
    }

    // Convert JSON Schema to Gemini's OpenAPI 3.0 subset
    const responseSchema = toGeminiSchema(schema);

    const requestPayload = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema,
      },
    };

    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${geminiApiKey}`;

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    }, {
      errorLabel: 'Gemini generate request failed',
    });

    if (!response.ok) {
      const text = await readErrorBody(response);
      throw new Error(`Gemini API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as any;
    const responseText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { responseText, requestPayload };
  }
}

/**
 * Convert JSON Schema draft-07 to Gemini's OpenAPI 3.0 subset.
 * Strips `$schema`, `additionalProperties`, and other unsupported keys.
 */
function toGeminiSchema(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toGeminiSchema);
  }
  if (obj !== null && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      // Strip unsupported keys
      if (k === '$schema' || k === 'additionalProperties' || k === 'title' || k === 'description' || k === 'minItems') {
        continue;
      }
      out[k] = toGeminiSchema(v);
    }
    return out;
  }
  return obj;
}
