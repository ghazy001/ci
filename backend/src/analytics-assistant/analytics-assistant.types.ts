export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'kpi';

export type AnalyticsChartRecommendation = {
  type: ChartType;
  x?: string | null;
  y?: string | null;
  series?: string | null;
  reason: string;
};

export type AnalyticsSqlPlan = {
  needsSql: boolean;
  sql: string | null;
  explanation: string;
  chart: AnalyticsChartRecommendation;
  unavailableReason?: string | null;
};

export type AnalyticsAnswer = {
  question: string;
  needsSql: boolean;
  sql: string | null;
  rows: Record<string, unknown>[];
  chart: AnalyticsChartRecommendation;
  explanation: string;
  insight: string;
  unavailableReason?: string | null;

  scope: {
    mode: 'GLOBAL_ADMIN' | 'PROJECT' | 'ASSIGNED_PROJECTS';
    projectId?: string | null;
    assignedProjectIds?: string[];
  };
};
export type AnalyticsInsightResult = {
  insight: string;
  keyFindings: string[];
  recommendation?: string | null;
};
