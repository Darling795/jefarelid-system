import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';

/** Local-disk uploads directory (created on boot). Sits under the backend cwd. */
export const UPLOAD_DIR = join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

interface UploadMeta {
  label?: string;
  category?: string;
}

@Injectable()
export class DocumentsService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async createForTenant(
    tenantId: string,
    file: Express.Multer.File,
    meta: UploadMeta,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      this.discard(file);
      throw new AppException(ApiCode.NOT_FOUND, 'Tenant not found.', HttpStatus.NOT_FOUND);
    }
    return this.persist({ tenantId }, file, meta);
  }

  async createForContract(
    contractId: string,
    file: Express.Multer.File,
    meta: UploadMeta,
  ) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      this.discard(file);
      throw new AppException(ApiCode.NOT_FOUND, 'Contract not found.', HttpStatus.NOT_FOUND);
    }
    return this.persist({ contractId }, file, meta);
  }

  private async persist(
    owner: { tenantId?: string; contractId?: string },
    file: Express.Multer.File,
    meta: UploadMeta,
  ) {
    if (!file) {
      throw new AppException(ApiCode.VALIDATION_ERROR, 'A file is required.', HttpStatus.BAD_REQUEST);
    }
    const doc = await this.prisma.document.create({
      data: {
        ...owner,
        label: meta.label?.trim() || file.originalname,
        category: meta.category?.trim() || null,
        fileName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
    return this.view(doc);
  }

  async listForTenant(tenantId: string) {
    const docs = await this.prisma.document.findMany({
      where: { tenantId },
      orderBy: { uploadedAt: 'desc' },
    });
    return docs.map((d) => this.view(d));
  }

  async listForContract(contractId: string) {
    const docs = await this.prisma.document.findMany({
      where: { contractId },
      orderBy: { uploadedAt: 'desc' },
    });
    return docs.map((d) => this.view(d));
  }

  /** File handle for streaming a download. */
  async fileFor(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) {
      throw new AppException(ApiCode.NOT_FOUND, 'Document not found.', HttpStatus.NOT_FOUND);
    }
    const path = join(UPLOAD_DIR, doc.storedName);
    if (!existsSync(path)) {
      throw new AppException(ApiCode.NOT_FOUND, 'File is missing on disk.', HttpStatus.NOT_FOUND);
    }
    return { stream: createReadStream(path), mimeType: doc.mimeType, fileName: doc.fileName };
  }

  async remove(id: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) {
      throw new AppException(ApiCode.NOT_FOUND, 'Document not found.', HttpStatus.NOT_FOUND);
    }
    await this.prisma.document.delete({ where: { id } });
    this.discardByName(doc.storedName);
  }

  private view(d: {
    id: string;
    label: string;
    category: string | null;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: Date;
  }) {
    return {
      id: d.id,
      label: d.label,
      category: d.category,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      uploadedAt: d.uploadedAt.toISOString(),
    };
  }

  /** Best-effort cleanup of an on-disk file. */
  private discard(file?: Express.Multer.File) {
    if (file?.filename) this.discardByName(file.filename);
  }
  private discardByName(storedName: string) {
    try {
      const path = join(UPLOAD_DIR, storedName);
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // ignore — an orphaned file is harmless
    }
  }
}
