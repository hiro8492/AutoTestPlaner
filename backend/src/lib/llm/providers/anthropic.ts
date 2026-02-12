import type { LLMProvider, ModelInfo } from '../types';
import { getLLMSettings } from '../settings';
import { fetchWithTimeout, readErrorBody } from '../http-client';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;

  isAvailable(): boolean {
    return getLLMSettings().anthropicApiKey.length > 0;
  }

  async listModels(): Promise<ModelInfo[]> {
    const { anthropicApiKey } = getLLMSettings();
    if (!anthropicApiKey) {
      return [];
    }

    const response = await fetchWithTimeout('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
    }, {
      errorLabel: 'Anthropic list models request failed',
    });
    if (!response.ok) {
      const text = await readErrorBody(response);
      throw new Error(`Anthropic list models error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      data?: Array<{ id: string; display_name?: string }>;
    };

    return (data.data || [])
      .filter((m) => m.id.startsWith('claude-'))
      .map((m) => ({
        id: `anthropic:${m.id}`,
        name: m.display_name || m.id,
        provider: 'anthropic' as const,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async generate(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    _schema: object,
  ): Promise<{ responseText: string; requestPayload: object }> {
    const { anthropicApiKey } = getLLMSettings();
    if (!anthropicApiKey) {
      throw new Error('Anthropic APIキーが設定されていません。');
    }

    // Anthropic has no JSON mode — rely on system prompt instruction
    const requestPayload = {
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    };

    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestPayload),
    }, {
      errorLabel: 'Anthropic generate request failed',
    });

    if (!response.ok) {
      const text = await readErrorBody(response);
      throw new Error(`Anthropic API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as any;
    // Anthropic returns content as an array of content blocks
    const responseText = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    return { responseText, requestPayload };
  }
}
