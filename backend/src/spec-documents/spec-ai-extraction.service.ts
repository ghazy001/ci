import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { WorkItemType } from '@prisma/client';
import {
  DEFAULT_SPEC_AI_MODEL,
  isValidSpecAiModel,
  SpecAiModelId,
} from './spec-ai-models';

type ExtractedSpecWorkItem = {
  title: string;
  type: WorkItemType;
  description: string;
  acceptanceCriteria: string[];
  businessRules: string[];
  priority?: string | null;
  confidence: number;
  sourceSection?: string | null;
};

type SpecExtractionResponse = {
  workItems: ExtractedSpecWorkItem[];
};

@Injectable()
export class SpecAiExtractionService {
  private readonly logger = new Logger(SpecAiExtractionService.name);

  private readonly defaultModel: SpecAiModelId = isValidSpecAiModel(
    process.env.GROQ_SPEC_MODEL,
  )
    ? process.env.GROQ_SPEC_MODEL
    : DEFAULT_SPEC_AI_MODEL;

  private readonly groq: Groq | null = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

  isEnabled(): boolean {
    return !!this.groq;
  }

  async extractWorkItems(input: {
    fileName: string;
    mimeType: string;
    documentText: string;
    model?: string;
  }): Promise<SpecExtractionResponse & { model: SpecAiModelId }> {
    if (!this.groq) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const selectedModel: SpecAiModelId = isValidSpecAiModel(input.model)
      ? input.model
      : this.defaultModel;

    const trimmedText = this.limitDocumentText(input.documentText);

    const completion = await this.groq.chat.completions.create({
      model: selectedModel,
      temperature: 0.1,
      max_completion_tokens: 4096,
      top_p: 1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'Tu es un expert QA / Business Analyst.',
            'Tu extrais des WorkItems depuis un cahier de spécifications techniques.',
            'Réponds uniquement avec un JSON valide.',
            'Ne fabrique jamais des informations absentes.',
            'Garde la langue originale du document.',
            'Ignore les pages de garde, sommaires, signatures, historique des versions et contenu administratif.',
            'Un WorkItem doit représenter une fonctionnalité, user story, tâche technique, amélioration ou bug.',
            'Les contraintes, validations, permissions, limites, formats obligatoires et règles métier vont dans businessRules.',
            'Les comportements attendus et résultats vérifiables vont dans acceptanceCriteria.',
            'Si une section contient plusieurs fonctionnalités, crée plusieurs WorkItems.',
            'Si le document est ambigu, retourne moins de WorkItems mais avec meilleure confiance.',
            'Le champ confidence doit être entre 0 et 1.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            expectedJsonShape: {
              workItems: [
                {
                  title: 'string',
                  type: 'FEATURE | BUG | IMPROVEMENT | TASK | USER_STORY',
                  description: 'string',
                  acceptanceCriteria: ['string'],
                  businessRules: ['string'],
                  priority: 'string | null',
                  confidence: 0.9,
                  sourceSection: 'string | null',
                },
              ],
            },
            file: {
              fileName: input.fileName,
              mimeType: input.mimeType,
            },
            documentText: trimmedText,
          }),
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';
    const parsed = this.safeJsonParse(rawContent);

    return {
      ...this.normalizeResponse(parsed),
      model: selectedModel,
    };
  }

  private limitDocumentText(text: string): string {
    const maxChars = Number(process.env.SPEC_DOC_MAX_CHARS || 45000);

    if (text.length <= maxChars) {
      return text;
    }

    return text.slice(0, maxChars);
  }

  private safeJsonParse(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch (error: any) {
      this.logger.warn(`Failed to parse AI JSON: ${error?.message}`);
      return {};
    }
  }

  private normalizeResponse(input: unknown): SpecExtractionResponse {
    const obj =
      input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};

    const rawItems = Array.isArray(obj.workItems) ? obj.workItems : [];

    return {
      workItems: rawItems
        .map((item) => this.normalizeItem(item))
        .filter((item): item is ExtractedSpecWorkItem => !!item),
    };
  }

  private normalizeItem(input: unknown): ExtractedSpecWorkItem | null {
    const obj =
      input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};

    const title = this.asString(obj.title);
    if (!title) return null;

    return {
      title,
      type: this.asWorkItemType(obj.type),
      description: this.asString(obj.description),
      acceptanceCriteria: this.asStringArray(obj.acceptanceCriteria),
      businessRules: this.asStringArray(obj.businessRules),
      priority: this.asNullableString(obj.priority),
      confidence: this.asConfidence(obj.confidence),
      sourceSection: this.asNullableString(obj.sourceSection),
    };
  }

  private asWorkItemType(value: unknown): WorkItemType {
    if (typeof value !== 'string') return WorkItemType.TASK;

    const normalized = value.trim().toUpperCase();

    if (normalized in WorkItemType) {
      return normalized as WorkItemType;
    }

    return WorkItemType.TASK;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private asNullableString(value: unknown): string | null {
    const result = this.asString(value);
    return result || null;
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return this.unique(
      value
        .flatMap((item) =>
          typeof item === 'string' ? item.split(/\r?\n+/) : [],
        )
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  private asConfidence(value: unknown): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0.75;
    }

    return Number(Math.max(0, Math.min(1, value)).toFixed(2));
  }

  private unique(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
      const clean = value.trim();
      if (!clean) continue;

      const key = clean.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      result.push(clean);
    }

    return result;
  }
}
