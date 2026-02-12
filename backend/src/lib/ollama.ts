/**
 * Backward-compatible facade.
 * New code should import from './llm/registry' directly.
 */
export { callLLM as callOllama, listAllModels as listOllamaModels } from './llm/registry';
export type { GenerateIRParams, ModelInfo as OllamaModelInfo } from './llm/registry';
