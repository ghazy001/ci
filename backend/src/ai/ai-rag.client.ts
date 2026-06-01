import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export type RagDocumentChunkPayload = {
  id: string;
  projectId: string;
  sourceType: string;
  sourceId?: string | null;
  title?: string | null;
  content: string;
  metadata?: Record<string, any>;
};

export type RagSearchPayload = {
  projectId: string;
  query: string;
  topK?: number;
};

export type RagSearchResult = {
  id: string;
  score: number;
  sourceType: string;
  sourceId?: string | null;
  title?: string | null;
  content: string;
  metadata: Record<string, any>;
};

@Injectable()
export class AiRagClient {
  private readonly logger = new Logger(AiRagClient.name);
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

  async indexChunk(payload: RagDocumentChunkPayload) {
    try {
      const res = await this.http.post('/v1/rag/chunks', payload);
      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data;

      this.logger.error(
        `RAG indexing failed. Status=${status || 'unknown'} Detail=${JSON.stringify(
          detail || error?.message,
        )}`,
      );

      throw new BadGatewayException(
        'AI RAG indexing service is unavailable or returned an error',
      );
    }
  }

  async search(payload: RagSearchPayload): Promise<RagSearchResult[]> {
    try {
      const res = await this.http.post<RagSearchResult[]>('/v1/rag/search', {
        projectId: payload.projectId,
        query: payload.query,
        topK: payload.topK ?? 5,
      });

      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data;

      this.logger.error(
        `RAG search failed. Status=${status || 'unknown'} Detail=${JSON.stringify(
          detail || error?.message,
        )}`,
      );

      throw new BadGatewayException(
        'AI RAG search service is unavailable or returned an error',
      );
    }
  }
}
