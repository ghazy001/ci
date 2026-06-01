import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class DocumentTextExtractorService {
  async extract(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const mimeType = file.mimetype;
    const fileName = file.originalname.toLowerCase();

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return this.extractPdf(file.buffer);
    }

    if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      return this.extractDocx(file.buffer);
    }

    if (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md')
    ) {
      return this.cleanText(file.buffer.toString('utf-8'));
    }

    throw new BadRequestException(
      'Unsupported file type. Please upload PDF, DOCX, TXT, or MD.',
    );
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return this.cleanText(result.text);
    } finally {
      await parser.destroy();
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return this.cleanText(result.value);
  }

  private cleanText(value: string): string {
    return value
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
