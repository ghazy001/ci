export const SPEC_AI_MODELS = [
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B Versatile',
    provider: 'Meta / Groq',
    description: 'Balanced and reliable model for structured extraction.',
  },
  {
    id: 'openai/gpt-oss-120b',
    label: 'GPT OSS 120B',
    provider: 'OpenAI OSS / Groq',
    description: 'Large open-weight model for deep requirement analysis.',
  },
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    label: 'Llama 4 Scout 17B Instruct',
    provider: 'Meta / Groq',
    description: 'Fast instruct model for quick document extraction.',
  },
] as const;

export type SpecAiModelId = (typeof SPEC_AI_MODELS)[number]['id'];

export const DEFAULT_SPEC_AI_MODEL: SpecAiModelId = 'llama-3.3-70b-versatile';

export function isValidSpecAiModel(value: unknown): value is SpecAiModelId {
  return (
    typeof value === 'string' &&
    SPEC_AI_MODELS.some((model) => model.id === value)
  );
}
