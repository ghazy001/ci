import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { AutomationFramework, BrowserTarget } from '@prisma/client';

export type AiGenerateAutomationScriptRequest = {
  requestId: string;
  tenantId: string;
  userId: string;

  testCaseId: string;
  workItemId: string;

  testCase: Record<string, any>;
  workItem: Record<string, any>;

  generationContext: {
    framework: AutomationFramework;
    targetUrl: string;
    browser?: BrowserTarget | null;
    environment?: string | null;
    selectorsStrategy?: string | null;
    auth?: {
      required: boolean;
      role?: string | null;
      instructions?: string | null;
    };
    extraInstructions?: string | null;
    variables?: Record<string, string>;
  };
};

export type AiGeneratedAutomationScript = {
  fileName: string;
  language: string;
  code: string;
  explanation?: string | null;
  dependencies: string[];
  setupNotes: string[];
  selectorsUsed: {
    purpose: string;
    selector: string;
    source: string;
  }[];
  warnings: string[];
};

export type AiGenerateAutomationScriptResponse = {
  requestId: string;
  testCaseId: string;
  workItemId: string;

  provider: string;
  model: string;
  promptVersion: string;
  generationMethod: string;
  confidence: number;

  warnings: string[];
  pageInspection?: Record<string, any> | null;

  script: AiGeneratedAutomationScript;
};
export type AiCreateAutomationScriptJobResponse = {
  jobId: string;
  status: string;
};

export type AiAutomationScriptJobStatusResponse = {
  jobId: string;
  status: string;
  ready: boolean;
  successful?: boolean | null;
  result?: AiGenerateAutomationScriptResponse | null;
  error?: string | null;
};

@Injectable()
export class AiScriptGenerationClient {
  private readonly logger = new Logger(AiScriptGenerationClient.name);
  private readonly http: AxiosInstance;

  constructor() {
    const baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    const timeout = Number(process.env.AI_SERVICE_TIMEOUT_MS || 120000);

    this.http = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async generateScript(
    payload: AiGenerateAutomationScriptRequest,
  ): Promise<AiGenerateAutomationScriptResponse> {
    try {
      const res = await this.http.post<AiGenerateAutomationScriptResponse>(
        '/v1/automation-scripts/generate',
        payload,
      );

      this.validateResponse(res.data);

      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data;

      this.logger.error(
        `AI script generation failed. Status=${status || 'unknown'} Detail=${JSON.stringify(
          detail || error?.message,
        )}`,
      );

      throw new BadGatewayException(
        'AI automation script generation service is unavailable or returned an invalid response',
      );
    }
  }

  private validateResponse(response: AiGenerateAutomationScriptResponse) {
    if (!response?.script) {
      throw new Error('Invalid AI response: script is missing');
    }

    if (!response.script.fileName?.trim()) {
      throw new Error('Invalid AI response: fileName is missing');
    }

    if (!response.script.language?.trim()) {
      throw new Error('Invalid AI response: language is missing');
    }

    if (!response.script.code?.trim()) {
      throw new Error('Invalid AI response: code is missing');
    }
  }
  async createGenerationJob(
    payload: AiGenerateAutomationScriptRequest,
  ): Promise<AiCreateAutomationScriptJobResponse> {
    try {
      const res = await this.http.post<AiCreateAutomationScriptJobResponse>(
        '/v1/automation-script-generations/jobs',
        payload,
      );

      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data;

      this.logger.error(
        `AI automation script async job creation failed. Status=${
          status || 'unknown'
        } Detail=${JSON.stringify(detail || error?.message)}`,
      );

      throw new BadGatewayException(
        'AI automation script generation job service is unavailable',
      );
    }
  }

  async getGenerationJobStatus(
    jobId: string,
  ): Promise<AiAutomationScriptJobStatusResponse> {
    try {
      const res = await this.http.get<AiAutomationScriptJobStatusResponse>(
        `/v1/automation-script-generations/jobs/${jobId}`,
      );

      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data;

      this.logger.error(
        `AI automation script async job status failed. Status=${
          status || 'unknown'
        } Detail=${JSON.stringify(detail || error?.message)}`,
      );

      throw new BadGatewayException(
        'AI automation script generation job status service is unavailable',
      );
    }
  }
}
