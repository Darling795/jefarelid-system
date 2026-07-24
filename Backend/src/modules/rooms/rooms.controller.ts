import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Controller()
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get('buildings/:buildingId/rooms')
  listForBuilding(@Param('buildingId') buildingId: string) {
    return this.rooms.listForBuilding(buildingId);
  }

  @Post('buildings/:buildingId/rooms')
  create(@Param('buildingId') buildingId: string, @Body() dto: CreateRoomDto) {
    return this.rooms.create(buildingId, dto);
  }

  @Get('rooms/:id')
  findOne(@Param('id') id: string) {
    return this.rooms.findOne(id);
  }

  @Patch('rooms/:id')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.rooms.update(id, dto);
  }

  @Delete('rooms/:id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.rooms.remove(id);
  }
}
