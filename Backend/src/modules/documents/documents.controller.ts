import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import { extname } from 'path';

import { DocumentsService, UPLOAD_DIR } from './documents.service';
import { UploadDocumentDto } from './dto/document.dto';

// Shared Multer config: store on local disk under a random name, 15 MB cap.
const upload = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) =>
      cb(null, `${randomBytes(16).toString('hex')}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
};

@Controller()
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post('tenants/:tenantId/documents')
  @UseInterceptors(FileInterceptor('file', upload))
  createForTenant(
    @Param('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.docs.createForTenant(tenantId, file, dto);
  }

  @Get('tenants/:tenantId/documents')
  listForTenant(@Param('tenantId') tenantId: string) {
    return this.docs.listForTenant(tenantId);
  }

  @Post('contracts/:contractId/documents')
  @UseInterceptors(FileInterceptor('file', upload))
  createForContract(
    @Param('contractId') contractId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.docs.createForContract(contractId, file, dto);
  }

  @Get('contracts/:contractId/documents')
  listForContract(@Param('contractId') contractId: string) {
    return this.docs.listForContract(contractId);
  }

  @Get('documents/:id/file')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { stream, mimeType, fileName } = await this.docs.fileFor(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    stream.pipe(res);
  }

  @Delete('documents/:id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.docs.remove(id);
  }
}
