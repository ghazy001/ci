import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { JiraAdfParser, ParsedBlock } from './jira-adf.parser';
import { NormalizedJiraContent } from './work-items.mapper';

type AiExtractionResponse = {
  description?: string;
  acceptanceCriteria?: string[];
  businessRules?: string[];
  tasks?: string[];
  testCases?: string[];
  definitionOfDone?: string[];
  notes?: string[];
  confidence?: number;
};

@Injectable()
export class JiraAiExtractionService {
  private readonly logger = new Logger(JiraAiExtractionService.name);
  private readonly model = process.env.GROQ_MODEL || 'qwen/qwen3-32b';
  private readonly groq: Groq | null = process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

  isEnabled(): boolean {
    return !!this.groq;
  }

  async refineIssueExtraction(
    issue: any,
    rulesResult: NormalizedJiraContent,
    reasons: string[],
  ): Promise<NormalizedJiraContent> {
    if (!this.groq) {
      return rulesResult;
    }

    const documentText = this.buildPromptDocument(issue?.fields?.description);
    const summary = issue?.fields?.summary ?? '';
    const issueType = issue?.fields?.issuetype?.name ?? '';
    const priority = issue?.fields?.priority?.name ?? '';

    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        temperature: 0.1,
        max_completion_tokens: 1400,
        response_format: { type: 'json_object' },
        ...(this.model === 'qwen/qwen3-32b'
          ? { reasoning_effort: 'default' as const }
          : {}),
        messages: [
          {
            role: 'system',
            content: [
              'Tu extrais et normalises le contenu d’un ticket Jira.',
              'Réponds uniquement avec un JSON valide.',
              'Ne fabrique jamais des informations absentes.',
              'Garde la langue d’origine du ticket.',
              'Le champ "description" doit contenir seulement le besoin principal ou le contexte principal.',
              'Les contraintes, validations, obligations, limites, formats obligatoires, prérequis, règles métier vont dans "businessRules".',
              'Les comportements attendus côté utilisateur ou système vont dans "acceptanceCriteria".',
              'Les tâches techniques vont dans "tasks".',
              'Les cas de test vont dans "testCases".',
              'La définition de fini va dans "definitionOfDone".',
              'Les liens, docs, références, pièces jointes vont dans "notes".',
              'Si tu n’es pas sûr, laisse le champ concerné vide plutôt que d’inventer.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              summary,
              issueType,
              priority,
              fallbackReasons: reasons,
              currentRulesExtraction: rulesResult,
              jiraDocument: documentText,
            }),
          },
        ],
      });

      const rawContent = completion.choices[0]?.message?.content ?? '{}';
      const aiResult = this.normalizeAiResponse(this.safeJsonParse(rawContent));

      return this.mergeResults(rulesResult, aiResult, reasons);
    } catch (error: any) {
      this.logger.warn(
        `Groq fallback failed: ${error?.message || 'unknown error'}`,
      );
      return rulesResult;
    }
  }

  private buildPromptDocument(adf: unknown): string {
    const blocks = JiraAdfParser.parse(adf);

    return blocks
      .map((block) => this.renderBlock(block))
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  private renderBlock(block: ParsedBlock): string {
    if (block.type === 'heading') {
      return `## ${block.text}`;
    }

    if (block.type === 'paragraph') {
      return block.text;
    }

    if (block.type === 'bullet_list') {
      return block.items.map((item) => `- ${item}`).join('\n');
    }

    if (block.type === 'ordered_list') {
      return block.items
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n');
    }

    return block.items
      .map((item) => `- ${item.checked ? '[x]' : '[ ]'} ${item.text}`)
      .join('\n');
  }

  private safeJsonParse(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  private normalizeAiResponse(input: unknown): Required<AiExtractionResponse> {
    const obj =
      input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};

    return {
      description: this.asString(obj.description),
      acceptanceCriteria: this.asStringArray(obj.acceptanceCriteria),
      businessRules: this.asStringArray(obj.businessRules),
      tasks: this.asStringArray(obj.tasks),
      testCases: this.asStringArray(obj.testCases),
      definitionOfDone: this.asStringArray(obj.definitionOfDone),
      notes: this.asStringArray(obj.notes),
      confidence: this.asConfidence(obj.confidence),
    };
  }

  private mergeResults(
    rules: NormalizedJiraContent,
    ai: Required<AiExtractionResponse>,
    reasons: string[],
  ): NormalizedJiraContent {
    const acceptanceCriteria =
      ai.acceptanceCriteria.length >= rules.acceptanceCriteria.length
        ? ai.acceptanceCriteria
        : rules.acceptanceCriteria;

    const description =
      ai.description && ai.description.length > 20
        ? ai.description
        : rules.description;

    return {
      ...rules,
      description,
      acceptanceCriteria: this.unique([...acceptanceCriteria]),
      businessRules: this.unique([...rules.businessRules, ...ai.businessRules]),
      extraSections: {
        tasks: this.unique([...rules.extraSections.tasks, ...ai.tasks]),
        testCases: this.unique([
          ...rules.extraSections.testCases,
          ...ai.testCases,
        ]),
        definitionOfDone: this.unique([
          ...rules.extraSections.definitionOfDone,
          ...ai.definitionOfDone,
        ]),
        notes: this.unique([...rules.extraSections.notes, ...ai.notes]),
      },
      extractionMeta: {
        method: 'rules_plus_ai',
        confidence: Number(
          Math.min(
            0.99,
            Math.max(rules.extractionMeta.confidence, ai.confidence, 0.88),
          ).toFixed(2),
        ),
        fallbackReasons: reasons,
        model: this.model,
      },
    };
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
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
      return 0.85;
    }

    return Math.max(0, Math.min(1, value));
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
