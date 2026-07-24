import { Controller, Get } from '@nestjs/common';

import { Public } from '../common/auth/public.decorator';
import { SkipTransform } from '../common/http/skip-transform.decorator';

@Controller('health')
export class HealthController {
  // GET /api/health — no auth, no envelope. Verifies the servers are talking.
  @Public()
  @SkipTransform()
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
