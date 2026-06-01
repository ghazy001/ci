import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpecDocumentsService } from './spec-documents.service';
import { ImportSpecWorkItemsDto } from './dto/import-spec-work-items.dto';
import { SPEC_AI_MODELS } from './spec-ai-models';

@UseGuards(JwtAuthGuard)
@Controller('spec-documents')
export class SpecDocumentsController {
  constructor(private readonly specDocumentsService: SpecDocumentsService) {}

  @Get('models')
  getModels() {
    return {
      models: SPEC_AI_MODELS,
    };
  }

  @Post('preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
        ];

        const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];

        const lowerName = file.originalname.toLowerCase();
        const hasAllowedExtension = allowedExtensions.some((extension) =>
          lowerName.endsWith(extension),
        );

        if (allowedMimeTypes.includes(file.mimetype) || hasAllowedExtension) {
          callback(null, true);
          return;
        }

        callback(
          new BadRequestException(
            'Unsupported file type. Please upload PDF, DOCX, TXT, or MD.',
          ),
          false,
        );
      },
    }),
  )
  preview(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Body('model') model?: string,
  ) {
    return this.specDocumentsService.preview(
      req.user.id,
      req.user.role,
      projectId,
      file,
      model,
    );
  }

  @Post('import')
  importWorkItems(@Req() req: any, @Body() dto: ImportSpecWorkItemsDto) {
    return this.specDocumentsService.importWorkItems(
      req.user.id,
      req.user.role,
      dto,
      {
        actor: req.user,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    );
  }
}
