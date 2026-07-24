import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

import { ReportsService } from './reports.service';
import { ReportTable, toPdf, toXlsx } from './export.util';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('billing-statement')
  async billing(@Query() q: { tenantId?: string; periodMonth?: string; format?: string }, @Res() res: Response) {
    return this.output(await this.reports.billingStatement(q.tenantId, q.periodMonth), q.format, res, 'billing-statement');
  }

  @Get('payment-history')
  async paymentHistory(@Query() q: { tenantId?: string; dateFrom?: string; dateTo?: string; format?: string }, @Res() res: Response) {
    return this.output(await this.reports.paymentHistory(q.tenantId, q.dateFrom, q.dateTo), q.format, res, 'payment-history');
  }

  @Get('collection')
  async collection(@Query() q: { dateFrom?: string; dateTo?: string; buildingId?: string; format?: string }, @Res() res: Response) {
    return this.output(await this.reports.collection(q.dateFrom, q.dateTo, q.buildingId), q.format, res, 'collection');
  }

  @Get('occupancy')
  async occupancy(@Query() q: { format?: string }, @Res() res: Response) {
    return this.output(await this.reports.occupancy(), q.format, res, 'occupancy');
  }

  @Get('utility-expense')
  async utilityExpense(@Query() q: { dateFrom?: string; dateTo?: string; buildingId?: string; format?: string }, @Res() res: Response) {
    return this.output(await this.reports.utilityExpense(q.dateFrom, q.dateTo, q.buildingId), q.format, res, 'utility-expense');
  }

  @Get('contract-expiry')
  async contractExpiry(@Query() q: { days?: string; format?: string }, @Res() res: Response) {
    return this.output(await this.reports.contractExpiry(q.days ? Number(q.days) : 90), q.format, res, 'contract-expiry');
  }

  @Get('tax-summary')
  async taxSummary(@Query() q: { periodFrom?: string; periodTo?: string; format?: string }, @Res() res: Response) {
    return this.output(await this.reports.taxSummary(q.periodFrom, q.periodTo), q.format, res, 'tax-summary');
  }

  private async output(report: ReportTable, format: string | undefined, res: Response, filename: string) {
    if (format === 'xlsx') {
      const buf = await toXlsx(report);
      this.file(res, buf, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return;
    }
    if (format === 'pdf') {
      const buf = await toPdf(report);
      this.file(res, buf, `${filename}.pdf`, 'application/pdf');
      return;
    }
    res.json({ data: report });
  }

  private file(res: Response, buf: Buffer, name: string, type: string) {
    res.set({
      'Content-Type': type,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(buf.length),
    });
    res.end(buf);
  }
}
