import { WorkItemType } from '@prisma/client';
import { JiraAdfParser } from './jira-adf.parser';

export type NormalizedJiraContent = {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  businessRules: string[];
  priority?: string | null;
  type: WorkItemType;
  extraSections: {
    tasks: string[];
    testCases: string[];
    definitionOfDone: string[];
    notes: string[];
  };
  extractionMeta: {
    method: 'rules' | 'rules_plus_ai';
    confidence: number;
    fallbackReasons?: string[];
    model?: string;
  };
};

export class WorkItemMapper {
  static fromJiraIssue(issue: any): NormalizedJiraContent {
    const fields = issue?.fields ?? {};
    const parsed = JiraAdfParser.build(fields.description);

    return {
      title: fields.summary ?? '',
      description: parsed.description,
      acceptanceCriteria: parsed.acceptanceCriteria,
      businessRules: parsed.businessRules,
      priority: fields.priority?.name ?? null,
      type: this.mapJiraIssueType(fields.issuetype?.name),
      extraSections: parsed.extraSections,
      extractionMeta: {
        method: 'rules',
        confidence: parsed.confidence,
      },
    };
  }

  static mapJiraIssueType(jiraType?: string): WorkItemType {
    const normalized = (jiraType ?? '').trim().toLowerCase();

    if (normalized.includes('bug')) return WorkItemType.BUG;
    if (normalized.includes('story')) return WorkItemType.USER_STORY;
    if (normalized.includes('task')) return WorkItemType.TASK;
    if (normalized.includes('improvement')) return WorkItemType.IMPROVEMENT;

    if (normalized.includes('feature') || normalized.includes('epic')) {
      return WorkItemType.FEATURE;
    }

    return WorkItemType.TASK;
  }
}
