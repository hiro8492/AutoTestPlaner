import type { LLMProvider, ModelInfo } from '../types';
import { getLLMSettings } from '../settings';
import { fetchWithTimeout, readErrorBody } from '../http-client';

function isLikelyChatModel(modelId: string): boolean {
  const id = modelId.toLowerCase();
  if (id.startsWith('gpt-')) return true;
  if (id.startsWith('chatgpt-')) return true;
  if (id.startsWith('o1-') || id.startsWith('o3-') || id.startsWith('o4-')) {
    return true;
  }
  return false;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;

  isAvailable(): boolean {
    return getLLMSettings().openaiApiKey.length > 0;
  }

  async listModels(): Promise<ModelInfo[]> {
    const { openaiApiKey, openaiBaseUrl } = getLLMSettings();
    if (!openaiApiKey) {
      return [];
    }

    const response = await fetchWithTimeout(`${openaiBaseUrl}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
    }, {
      errorLabel: 'OpenAI list models request failed',
    });
    if (!response.ok) {
      const text = await readErrorBody(response);
      throw new Error(`OpenAI list models error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      data?: Array<{ id: string }>;
    };

    return (data.data || [])
      .filter((m) => isLikelyChatModel(m.id))
      .map((m) => ({
        id: `openai:${m.id}`,
        name: m.id,
        provider: 'openai' as const,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async generate(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    schema: object,
  ): Promise<{ responseText: string; requestPayload: object }> {
    const { openaiApiKey, openaiBaseUrl } = getLLMSettings();
    if (!openaiApiKey) {
      throw new Error('OpenAI APIキーが設定されていません。');
    }

    // Build JSON Schema for response_format (strip $schema / additionalProperties for strict mode)
    const cleanSchema = stripUnsupportedKeys(schema);

    const requestPayload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'test_design_ir',
          strict: true,
          schema: cleanSchema,
        },
      },
      temperature: 0.2,
    };

    const response = await fetchWithTimeout(`${openaiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(requestPayload),
    }, {
      errorLabel: 'OpenAI generate request failed',
    });

    if (!response.ok) {
      const text = await readErrorBody(response);
      throw new Error(`OpenAI API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as any;
    const responseText = data.choices?.[0]?.message?.content || '';
    return { responseText, requestPayload };
  }
}

/** Strip keys not supported by OpenAI strict JSON schema mode */
function stripUnsupportedKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(stripUnsupportedKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '$schema') continue;
      out[k] = stripUnsupportedKeys(v);
    }
    return out;
  }
  return obj;
}
