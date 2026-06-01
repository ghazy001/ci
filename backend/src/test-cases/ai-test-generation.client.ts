import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export type AiGenerateTestCasesRequest = {
  requestId: string;
  tenantId: string;
  userId: string;
  workItemId: string;
  source: 'MANUAL' | 'JIRA' | 'SPEC_DOCUMENT';
  normalizedContent: Record<string, any>;
  generationOptions: {
    maxTestCases: number;
    includePositiveTests: boolean;
    includeNegativeTests: boolean;
    includeEdgeCases: boolean;
    includeSecurityTests: boolean;
    useRag: boolean;
    language?: string | null;
  };
};

export type AiGeneratedTestCase = {
  clientGeneratedId: string;
  title: string;
  type:
    | 'FUNCTIONAL'
    | 'VALIDATION'
    | 'NEGATIVE'
    | 'EDGE_CASE'
    | 'SECURITY'
    | 'UI'
    | 'INTEGRATION'
    | 'REGRESSION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  objective?: string | null;
  preconditions: string[];
  steps: {
    order: number;
    action: string;
    expected?: string | null;
  }[];
  expectedResult: string;
  testData: Record<string, any>;
  tags: string[];
  coverage: {
    acceptanceCriteria: string[];
    businessRules: string[];
  };
  confidence: number;
};

export type AiGenerateTestCasesResponse = {
  requestId: string;
  workItemId: string;
  provider: string;
  model: string;
  promptVersion: string;
  generationMethod: string;
  confidence: number;
  warnings: string[];
  testCases: AiGeneratedTestCase[];
};
export type AiCreateGenerationJobResponse = {
  jobId: string;
  status: string;
};

export type AiGenerationJobStatusResponse = {
  jobId: string;
  status: string;
  ready: boolean;
  successful?: boolean | null;
  result?: AiGenerateTestCasesResponse | null;
  error?: string | null;
};

@Injectable()
export class AiTestGenerationClient {
  private readonly logger = new Logger(AiTestGenerationClient.name);
  private readonly http: AxiosInstance;

  constructor() {
    const baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    const timeout = Number(process.env.AI_SERVICE_TIMEOUT_MS || 60000);

    this.http = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async generateTestCases(
    payload: AiGenerateTestCasesRequest,
  ): Promise<AiGenerateTestCasesResponse> {
    try {
      const res = await this.http.post<AiGenerateTestCasesResponse>(
        '/v1/test-cases/generate',
        payload,
      );

      this.validateResponse(res.data);

      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data;

      this.logger.error(
        `AI service test case generation failed. Status=${status || 'unknown'} Detail=${JSON.stringify(detail || error?.message)}`,
      );

      throw new BadGatewayException(
        'AI test case generation service is unavailable or returned an invalid response',
      );
    }
  }

  private validateResponse(response: AiGenerateTestCasesResponse) {
    if (!response || !Array.isArray(response.testCases)) {
      throw new Error('Invalid AI response: testCases array is missing');
    }

    for (const testCase of response.testCases) {
      if (!testCase.title?.trim()) {
        throw new Error('Invalid AI response: test case title is missing');
      }

      if (!Array.isArray(testCase.steps) || testCase.steps.length === 0) {
        throw new Error('Invalid AI response: test case steps are missing');
      }

      if (!testCase.expectedResult?.trim()) {
        throw new Error(
          'Invalid AI response: test case expectedResult is missing',
        );
      }
    }
  }
  async createGenerationJob(
    payload: AiGenerateTestCasesRequest,
  ): Promise<AiCreateGenerationJobResponse> {
    try {
      const res = await this.http.post<AiCreateGenerationJobResponse>(
        '/v1/test-case-generations/jobs',
        payload,
      );

      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data;

      this.logger.error(
        `AI async generation job creation failed. Status=${status || 'unknown'} Detail=${JSON.stringify(
          detail || error?.message,
        )}`,
      );

      throw new BadGatewayException(
        'AI test case generation job service is unavailable',
      );
    }
  }

  async getGenerationJobStatus(
    jobId: string,
  ): Promise<AiGenerationJobStatusResponse> {
    try {
      const res = await this.http.get<AiGenerationJobStatusResponse>(
        `/v1/test-case-generations/jobs/${jobId}`,
      );

      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data;

      this.logger.error(
        `AI async generation job status failed. Status=${status || 'unknown'} Detail=${JSON.stringify(
          detail || error?.message,
        )}`,
      );

      throw new BadGatewayException(
        'AI test case generation job status service is unavailable',
      );
    }
  }
}
