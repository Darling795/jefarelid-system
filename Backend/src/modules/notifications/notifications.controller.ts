import { Controller, Get } from '@nestjs/common';

import { NotificationsService } from './notifications.service';

// In-app alerts for the header bell. Available to any authenticated staff user.
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('alerts')
  alerts() {
    return this.notifications.alerts();
  }
}
