import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';

import { Roles } from '../../common/auth/roles.decorator';
import { SettingsService } from './settings.service';

class UpdateSettingDto {
  @IsString() @IsNotEmpty() value!: string;
}

@Roles('super_admin')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  list() {
    return this.settings.list();
  }

  @Patch(':key')
  update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settings.update(key, dto.value);
  }
}
