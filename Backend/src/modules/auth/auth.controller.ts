import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  Session,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Request, Response } from 'express';
import { Session as ExpressSession, SessionData } from 'express-session';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/auth/public.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Session() session: ExpressSession & Partial<SessionData>,
  ) {
    const user = await this.authService.login(dto.email, dto.password, session);
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    res.clearCookie('connect.sid');
  }

  @Get('me')
  me(@CurrentUser() user: User) {
    return { user: this.authService.toView(user) };
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(
      user,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
