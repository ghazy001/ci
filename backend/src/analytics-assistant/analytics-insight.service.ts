import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  AnalyticsChartRecommendation,
  AnalyticsInsightResult,
} from './analytics-assistant.types';

const INSIGHT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    insight: { type: 'string' },
    keyFindings: {
      type: 'array',
      items: { type: 'string' },
    },
    recommendation: { type: ['string', 'null'] },
  },
  required: ['insight', 'keyFindings', 'recommendation'],
};

@Injectable()
export class AnalyticsInsightService {
  private readonly logger = new Logger(AnalyticsInsightService.name);
  private readonly client: OpenAI | null;

  constructor() {
    this.client = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  async summarize(params: {
    question: string;
    rows: Record<string, unknown>[];
    chart: AnalyticsChartRecommendation;
    sql: string;
  }): Promise<string> {
    const fallback = this.fallbackSummary(params);

    if (!this.client) {
      return fallback;
    }

    if (params.rows.length === 0) {
      return fallback;
    }

    try {
      const sampleRows = params.rows.slice(0, 30);

      const completion = await this.client.chat.completions.create({
        model: process.env.ANALYTICS_OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `
You are a QA analytics assistant.

Explain SQL results clearly for a QA/testing dashboard user.
Do not mention hidden reasoning.
Do not invent data not present in rows.
Keep the explanation concise and actionable.
If there is a clear quality or process risk, mention it.
Return structured JSON only.
`.trim(),
          },
          {
            role: 'user',
            content: JSON.stringify(
              {
                question: params.question,
                chart: params.chart,
                rows: sampleRows,
                rowCount: params.rows.length,
              },
              null,
              2,
            ),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'analytics_insight',
            schema: INSIGHT_RESPONSE_SCHEMA,
            strict: true,
          },
        },
      });

      const raw = completion.choices[0]?.message?.content;

      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw) as AnalyticsInsightResult;

      const findings =
        parsed.keyFindings.length > 0
          ? `\n\nKey findings:\n${parsed.keyFindings
              .map((item) => `- ${item}`)
              .join('\n')}`
          : '';

      const recommendation = parsed.recommendation
        ? `\n\nRecommendation: ${parsed.recommendation}`
        : '';

      return `${parsed.insight}${findings}${recommendation}`;
    } catch (error: any) {
      this.logger.warn(
        `AI insight generation failed, using fallback: ${
          error?.message || 'unknown error'
        }`,
      );

      return fallback;
    }
  }

  private fallbackSummary(params: {
    question: string;
    rows: Record<string, unknown>[];
    chart: AnalyticsChartRecommendation;
  }): string {
    const { rows, question } = params;

    if (rows.length === 0) {
      return `No matching data was found for: "${question}".`;
    }

    if (rows.length === 1) {
      const entries = Object.entries(rows[0])
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      return `The query returned one result: ${entries}.`;
    }

    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    if (keys.length >= 2) {
      const labelKey = keys[0];
      const valueKey = keys[1];

      return `The result contains ${rows.length} rows. The top row is ${String(
        rows[0][labelKey],
      )} with ${String(rows[0][valueKey])}.`;
    }

    return `The query returned ${rows.length} rows.`;
  }
}
