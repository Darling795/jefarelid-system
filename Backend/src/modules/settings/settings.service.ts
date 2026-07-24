import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';

export const SETTING_KEYS = [
  'vat_rate',
  'wht_rate',
  'default_escalation_rate',
  'notification_lead_days',
  'invoice_generation_day',
] as const;

export interface Rates {
  vatRate: string;
  whtRate: string;
  defaultEscalationRate: string;
}

@Injectable()
export class SettingsService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async list() {
    const rows = await this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    return rows.map((r) => ({ key: r.key, value: r.value, description: r.description }));
  }

  async getMap(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async getRates(): Promise<Rates> {
    const map = await this.getMap();
    return {
      vatRate: map.vat_rate ?? '0.12',
      whtRate: map.wht_rate ?? '0.05',
      defaultEscalationRate: map.default_escalation_rate ?? '0.05',
    };
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const map = await this.getMap();
    const n = Number(map[key]);
    return Number.isFinite(n) ? n : fallback;
  }

  async update(key: string, value: string) {
    if (!SETTING_KEYS.includes(key as (typeof SETTING_KEYS)[number])) {
      throw new AppException(
        ApiCode.UNKNOWN_SETTING,
        `Unknown setting "${key}".`,
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.setting.update({ where: { key }, data: { value } });
    return { key, value };
  }
}
